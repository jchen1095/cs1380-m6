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
        // console.log("ROUTE WAS DELETED!");
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
                // console.log("COMMAND MAP???")
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
                
                let numLocalKeys = localKeys.length;

                // Edge case: no keys were given to me
                // TODO - clean up the logic to handle the search case.
                if (localKeys.length === 0 && args.length !== 2 && !args[1]) {
                    callback(null, true);
                    return;
                }

                // read each key from local.store, and use mapper
                let localKeyCounts = 0;
                const execMap = (key, e, v) => {
                    // console.log("Called execMap!, sid is:", id.getSID(global.nodeConfig));
                    if (e) {
                        callback(e);
                        return;
                    }
                    let outMappingCounts = 0;
                    const outMappingsPromise = mrLocalStorage.get("map")(key, v, global.distribution.util.require);
                    // outMappings is now a promise
                    outMappingsPromise.then((outMappings) => {
                        console.log("Promise resolved! Going to rest of the stuff;", outMappings);
                        // console.log("outMappings.length:", outMappings.length)
                        for (let i = 0; i < outMappings.length; i++) {
                            const mapKey = Object.keys(outMappings[i])[0]
                            const mapValue = outMappings[i][mapKey];
                            mrLocalStorage.set("mapKeys", mrLocalStorage.get("mapKeys").add(mapKey))
                            // console.log("localKeyCounts", localKeyCounts);
                            // console.log("outMappings Length:", outMappings.length)
                            global.distribution.local.store.batchAppend(mapValue, { key: mapKey, gid: `${context.gid}-map` }, (e, v) => {
                                outMappingCounts++;
                                if (outMappingCounts === outMappings.length) {
                                    // We're done with adding all the intermediate mappings for this specific key
                                    localKeyCounts++;

                                    // If we're done with all keys, send done notification
                                    console.log("localKeyCounts:", localKeyCounts)
                                    console.log("localKeys.length:", localKeys.length)
                                    if (localKeyCounts === numLocalKeys) {
                                        // We're done mapping, we can notify the orchestrator
                                        console.log("done going through all the keys; bye!");
                                        callback(null, true);
                                        return;
                                    }
                                }
                            });
                        }
                    });
                }
                // console.log(args.length);
                try {
                    if (args.length == 1) {
                        localKeys.forEach((key, index) => {
                            global.distribution.local.store.get({ key: key, gid: context.gid }, (e, v) => execMap(key, e, v));;
                        });
                    } else if (args.length == 2 && args[1] == true) {
                        // get the keys from the newUrls route
                        // console.log("DO WE EVER GET HERE???????");
                        global.distribution.local.newUrls.get((e, v) => {
                            let newUrlsResult = v;
                            if (e) {
                                newUrlsResult = []
                            }
                            // console.log("e:", e);
                            // console.log("v:", v);
                            numLocalKeys = v.length;
                            if (numLocalKeys === 0) {
                                // No keys to be found, just return
                                callback(null, true);
                                return;
                            }
                            // console.log('v:');
                            // console.log(v);
                            console.log(`${id.getSID(global.nodeConfig)}: result from newUrls get:`, result);
                            v.forEach((obj) => {
                                // console.log(`${id.getSID(global.nodeConfig)}: execMap is called with: `, Object.keys(obj)[0], Object.values(obj)[0]);
                                // console.log(`${id.getSID(global.nodeConfig)}: Object.keys(obj), Object.values(obj): `, Object.keys(obj), Object.values(obj));
                                // console.log("Object.key")
                                execMap(Object.keys(obj)[0], e, Object.values(obj)[0]);
                            })
                        });
                    }
                } catch (err) {
                    // console.log("ERROR FROM NOTIFY MAP LOGIC: ", err)
                    callback(err, null);
                }
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

