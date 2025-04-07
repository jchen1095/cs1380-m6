const { NotifyOps } = require("../util/enum");
const { id } = require("../util/util");

// Array to hold all mr instances this node is orchestrator for
let mrInstances = {}

function setup(config, callback) {
    const { instanceId, isOrchestrator, gid } = config;

    // Check if service wasn't already set up as orchestrator
    if (instanceId in mrInstances) {
        // This happens when we call comm.send on the group with the setup function, after setting up the orchestrator
        // If we deemed that this node is already the orchestrator for the provided instance, just return. 
        if (mrInstances[instanceId].isOrchestrator) {
            callback(null, true);
            return;
        }
    }

    // Object to keep track of ongoing MapReduce instances
    mrInstances[instanceId] = { gid: gid, isOrchestrator: isOrchestrator };

    // Set up the routes with the closure-like mr service
    global.distribution.local.routes.put(_mr(config), instanceId, (e, v) => {
        if (e) {
            callback(e);
            return;
        }
        callback(null, true);
    })
}

function teardown(instanceId, callback) {
    // Get the gid for that instance
    const { gid } = mrInstances[instanceId]

    // Delete the route
    global.distribution.local.routes.rem(instanceId, (e, v) => {
        console.log("ROUTE WAS DELETED!");
        // Clear the store
        global.distribution.local.store.batchDelete({ gid: `${gid}-map` }, (e, v) => {
            global.distribution.local.store.batchDelete({ gid: `${gid}-shuffle` }, (e, v) => {
                global.distribution.local.store.batchDelete({ gid: `${gid}-reduce` }, (e, v) => {
                    callback(null, true)
                })
            })
        })
    });
}

module.exports = { setup, teardown }


function _mr(config) {
    /**
     * Storage for local version of map, shuffle, and reduce
     */
    const mrLocalStorage = new Map();
    mrLocalStorage.set("listenCount", 0);
    mrLocalStorage.set("listenCallback", null);
    mrLocalStorage.set("mapKeys", new Set());
    mrLocalStorage.set("reduceOutputs", []);

    const context = {
        instanceId: config.instanceId,
        isOrchestrator: config.isOrchestrator,
        gid: config.gid,
        group: config.group,
        groupSize: Object.keys(config.group).length
    };

    function notify(configuration, callback) {
        const operation = configuration.operation;
        const args = configuration.args;

        if (!context.isOrchestrator) {
            _workerNotify(operation, args, callback);
        }
    }

    function _workerNotify(operation, args, callback) {
        switch (operation) {
            case NotifyOps.REGISTER_FUNCTIONS:
                _registerFunctions(...args);
                callback(null, true);
                break;
            case NotifyOps.COMMAND_SHUFFLE:
                /**
                 * RATIONALE: We won't be using a group.store.put call here, because
                 * we want to be able to put data inside of a custom "<group>-shuffle" group
                 * (instead of dealing with prefixes, this seems to be a bit cleaner).
                 * Moreover, we already have logic to do consistent hashing (to check if a
                 * key is ours), so might as well proceed this way.
                 */
                // Step 1: Get all map keys
                let mapKeyCount = 0;
                const lclmapKeys = mrLocalStorage.get("mapKeys");
                if (lclmapKeys.size === 0) {
                    callback(null, true);
                    return;
                }
                lclmapKeys.forEach((key) => {
                    // Determine node to send data to
                    const nid = _getNodeIdForKey(key);
                    const nodeToSendKeyTo = context.group[nid.substring(0, 5)];

                    // Get the value for the key
                    global.distribution.local.store.get({ gid: `${context.gid}-map`, key: key }, (e, valueForKey) => {
                        // Step 3: Do a local.comm.send to put the key in the appropriate node
                        global.distribution.local.comm.send(
                            [valueForKey, { key: key, gid: `${context.gid}-shuffle` }],
                            { node: nodeToSendKeyTo, service: "store", method: "batchAppend" },
                            (e, v) => {
                                if (e) {
                                    callback(e);
                                    return;
                                }
                                mapKeyCount++;
                                // Done shuffling! Notify the orchestrator that we're done
                                if (mapKeyCount === lclmapKeys.size) {
                                    // We're done mapping, we can notify the orchestrator
                                    callback(null, true);
                                }
                            }
                        )
                    })
                })
                break;
            case NotifyOps.COMMAND_REDUCE:
                // Step 0: Initialize final output array
                let finalOutput = [];

                // Step 1: Get all keys in "<group>-shuffle" group
                let keyCount = 0;
                global.distribution.local.store.search({ gid: `${context.gid}-shuffle` }, (e, reduceKeys) => {
                    // Step 2: For each key, call the reduce function. Maybe will need to 
                    // use the flatten logic just like last time (or maybe not?)

                    // Edge case: no key for this node
                    if (reduceKeys.length === 0) {
                        // Step 3: Notify that we're done
                        callback(null, finalOutput);
                        return;
                    }
                    reduceKeys.forEach((key) => {
                        // Get the value for the key
                        global.distribution.local.store.get({ gid: `${context.gid}-shuffle`, key: key }, (e, valueForKey) => {
                            // I have the value, I can start the reduction process.
                            keyCount++;
                            // Adding to the array to return in notification
                            const reduceOutput = mrLocalStorage.get("reduce")(key, valueForKey);
                            finalOutput.push(reduceOutput);
                            // Adding to store service for redundancy
                            global.distribution.local.store.put(
                                reduceOutput,
                                { gid: `${context.gid}-reduce`, key: key },
                                (e, v) => {
                                    if (keyCount === reduceKeys.length) {
                                        // Step 3: Notify that we're done
                                        callback(null, finalOutput);
                                    }
                                }
                            )
                        })
                    })
                })
                // Immediately callback to say we're good! (we will later be notified)
                break;

            case NotifyOps.COMMAND_MAP:
                // re-run the hashing to determine which keys belong to this node solely.
                // rationale is that checking for membership involves i/o ops., which will be very slow.
                // alternative is to only send the set of relevant keys, but this requires changing
                // the structure of comm.send too much. so instead we recompute to see if the keys
                // belong to us, which shouldn't be an insane overhead.
                const allKeys = args[0]
                let localKeys = [];
                allKeys.forEach((key, index) => {
                    if (_isKeyLocal(key)) {
                        localKeys.push(key);
                    }
                })

                // Edge case: no keys were given to me
                if (localKeys.length === 0) {
                    callback(null, true);
                }

                // read each key from local.store, and use mapper
                let localKeyCounts = 0;
                localKeys.forEach((key, index) => {
                    global.distribution.local.store.get({ key: key, gid: context.gid }, (e, v) => {
                        let outMappingCounts = 0;
                        const outMappingsPromise = mrLocalStorage.get("map")(key, v, global.distribution.util.require);
                        // outMappings is now a promise
                        outMappingsPromise.then((outMappings) => {
                            console.log("Promise resolved! Going to rest of the stuff;", outMappings);
                            for (let i = 0; i < outMappings.length; i++) {
                                const mapKey = Object.keys(outMappings[i])[0]
                                const mapValue = outMappings[i][mapKey];
                                mrLocalStorage.set("mapKeys", mrLocalStorage.get("mapKeys").add(mapKey))
                                global.distribution.local.store.batchAppend(mapValue, { key: mapKey, gid: `${context.gid}-map` }, (e, v) => {
                                    outMappingCounts++;
                                    if (outMappingCounts === outMappings.length) {
                                        // We're done with adding all the intermediate mappings for this specific key
                                        localKeyCounts++;

                                        // If we're done with all keys, send done notification
                                        if (localKeyCounts === localKeys.length) {
                                            // We're done mapping, we can notify the orchestrator
                                            callback(null, true);
                                        }
                                    }
                                });
                            }
                        })
                    })
                })
                break;
        }
    }

    function _registerFunctions(primitives) {
        const { map, reduce } = primitives;
        mrLocalStorage.set("map", map);
        mrLocalStorage.set("reduce", reduce);
    }

    function _isKeyLocal(key) {
        return _getNodeIdForKey(key) === id.getNID(global.nodeConfig);
    }

    function _getNodeIdForKey(key) {
        const kid = id.getID(key);
        const allNids = Object.entries(context.group).map(([_, value]) => id.getNID(value))
        const nodeId = id.consistentHash(kid, allNids)
        return nodeId;
    }

    return { notify }
}