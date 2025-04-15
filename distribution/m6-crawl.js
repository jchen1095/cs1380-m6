
const { getSID, getID } = require("@brown-ds/distribution/distribution/util/id")
const distribution = require("../distribution")
const { consistentHash } = require("./util/id")
const { config } = require("yargs")
const { id } = require("./util/util")

/**
 * USE THIS COMMAND:
 * lsof -ti :12345 | xargs kill -9 && lsof -ti :12346 | xargs kill -9 && lsof -ti :12347 | xargs kill -9
 * TO KILL ALL NODES
 */

/**
 * TODO: Change with AWS IP and Port
 */
const n1 = { ip: "127.0.0.1", port: 12345 }
const n2 = { ip: "127.0.0.1", port: 12346 }
const n3 = { ip: "127.0.0.1", port: 12347 }
// const n1 = { ip: "18.204.217.78", port: 12345 }
// const n2 = { ip: "3.82.200.164", port: 12346 }
// const n3 = { ip: "3.84.211.202", port: 12347 }

const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;

let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg"

const startTests = () => {

    // See https://edstem.org/us/courses/69551/discussion/6470553 for explanation of the
    // "require" argument
    const mapper = (key, value, require) => {
        console.log(`${distribution.util.id.getSID(global.nodeConfig)} Mapper Key:`, key);
        console.log(`${distribution.util.id.getSID(global.nodeConfig)} Mapper Value:`, value);
        // console.log(value);
        // Import execSync
        const { execSync, spawnSync } = require("child_process");
        const fs = require("fs");

        const resultPromise = new Promise((resolve, reject) => {
            let temp = {};
            const startTime = performance.now();
            try {
                temp = spawnSync('bash', ['./jen-crawl.sh', value], {
                    encoding: 'utf-8',
                    maxBuffer: 1024 * 1024 * 64
                });

            } catch (e) {
                console.log("error:", e.message);
                return;
            }
            const endTime = performance.now();
            console.log(`${distribution.util.id.getSID(global.nodeConfig)}: jen-crawl.sh elapsed time:`, endTime-startTime);
            const urlsRaw = temp.stderr;
            // const urlList = urlsRaw.split('\n').map((link) => link.trim()).filter((link) => link !== '')
            const urlList = urlsRaw.split('\n');
            // const urlList = urlsRaw.split('\n');
            // console.log("URLLIST:", urlList)
            // Step 5: Go through each URL to determine which node it should be sent to
            let urlCount = 0;
            const sidToURLList = {};
            const nsidToNode = {};
            if (urlList.length === 1 && urlList[0] === '') {
                resolve([{ [key]: true }])
                processDocs();
            } else {
                for (const rawUrl of urlList) {
                    distribution.crawl.store.getNode(rawUrl, (e, nodeToSend) => {
                        urlCount++;
                        // Add to per node batch of URLs
                        const sid = distribution.util.id.getSID(nodeToSend);
                        if (!Object.hasOwn(sidToURLList, sid)) {
                            sidToURLList[sid] = [];
                        }

                        const newUrlKey = distribution.util.id.getID(rawUrl).slice(0, 20);
                        sidToURLList[sid].push({ [newUrlKey]: rawUrl })
                        // console.log("v NODE:", v);
                        nsidToNode[sid] = nodeToSend;
                        // console.log("nsidToNode:", nsidToNode)
                        if (urlCount === urlList.length) {
                            let nodesReceivingURLList = 0;
                            // We've gone through all URLs. Let's send through the nextURLs service
                            for (let nsid in sidToURLList) {
                                if (nsid === distribution.util.id.getSID(global.nodeConfig)) {
                                    distribution.local.newUrls.put(
                                        sidToURLList[nsid],
                                        (e, v) => {
                                            nodesReceivingURLList++;
                                            if (nodesReceivingURLList === Object.keys(sidToURLList).length) {
                                                console.log("SEND ALL URLS FOR NEXT ROUND");
                                                resolve([{ [key]: true }])
                                                processDocs();
                                            }
                                        }
                                    )
                                } else {
                                    distribution.local.comm.send(
                                        [sidToURLList[nsid]],
                                        { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                                        (e, v) => {
                                            nodesReceivingURLList++;
                                            if (nodesReceivingURLList === Object.keys(sidToURLList).length) {
                                                console.log("SEND ALL URLS FOR NEXT ROUND");
                                                resolve([{ [key]: true }])
                                                processDocs();
                                            }
                                        })
                                }
                            }
                        }
                    })
                }
            }
            function processDocs() {
                const startTime = performance.now();
                const result = temp.stdout.trim()
                    .split("\n")
                    .map(line => {
                        const [ngram, freq, url] = line.split("|").map(s => s.trim());
                        return {
                            key: ngram,
                            value: {
                                freq: parseInt(freq, 10),
                                url: url
                            }
                        };
                    });
                const endTime = performance.now();
                console.log(`${distribution.util.id.getSID(global.nodeConfig)}: Process Docs elapsed:`, endTime-startTime);

                const startTime2 = performance.now();
                result.map(item => {
                    const ngram = item.key;
                    const freq = item.value.freq;
                    const url = item.value.url;
                    return { [ngram]: { freq: freq, url: url } }
                })
                distribution.local.store.appendForBatch(result, {gid: "ngrams"}, (e,v) => {
                    if(e) {
                        console.log("[Error in appendforBatch]:", e);
                        return;
                    }
                    console.log("APPENDED"+ v +  "NGRAMS")
                })
                
                const endTime2 = performance.now();
                console.log(`${distribution.util.id.getSID(global.nodeConfig)} Storing n-grams elapsed:`, endTime2-startTime2)
                resolve([{ [key]: true}]);
            }
        })

        return resultPromise;
    }

    const reducer = (key, values) => {
        console.log("Reducer key:", key);
        console.log("Reducer value:", values);
        // Import execSync
        const { execSync, spawnSync, exec } = require("child_process");

        const resultPromise = new Promise((resolve, reject) => {
            resolve([{ [key]: true }]);
        });

        return resultPromise;
    }

    const doMapReduce = (cb) => {
        // Putting own value due to transformation which loses non-alphanumerical characters
        global.distribution.crawl.store.getNode(CRAWL_URL, (e, node) => {
            if (e) {
                cb(e);
                return;
            }
            // console.log("does getNode return?");
            global.distribution.local.comm.send([{ [hashURL(CRAWL_URL)]: CRAWL_URL }], { node: node, service: "newUrls", "method": "put" }, (e, node) => {
                // console.log("does this get sent?");
                // console.log("newUrls put e:", e);
                // console.log("newUrls put node:", node);
                if (e) {
                    cb(e);
                    return;
                }
                // distribution.crawl.store.put(CRAWL_URL, hashURL(CRAWL_URL), (e, node) => {
                //     if(e) {
                //         cb(e);
                //         return;
                //     }
                // console.log("e:", e);
                // console.log("node:", node);
                const execFunction = () => {
                    distribution.crawl.mr.exec({ keys: [null], map: mapper, reduce: reducer }, (e, v) => {
                        // console.log("do we ever get back to here?")
                        global.distribution.crawl.comm.send([], { service: "newUrls", method: "flush" }, (e, v) => {
                            if (e.length > 0) {
                                console.log("FLUSH FAILED...");
                                return;
                            }
                            // console.log("FLUSHED");
                            global.distribution.crawl.comm.send([], { service: "newUrls", method: "status" }, (es, vs) => {
                                // console.log("vs:", vs);
                                // console.log("es:", es);
                                // 
                                if (es.length > 0) {
                                    console.log("CODE RED");
                                    return;
                                }
                                counts = Object.values(vs).map((node) => node.count);
                                sum = counts.reduce((acc, curr) => acc + curr, 0);
                                console.log("[MR ITERATION] Count: " + sum);
                                const notDone = Object.values(vs).filter((node) => !node.isDone);
                                if (notDone.length) {
                                    execFunction()
                                } else {
                                    console.log("DONT COME NEAR ME OR MY FAMILY EVER AGAIN.")
                                }
                            })
                        })
                        // // console.log("Done w/ crawl MapReduce!");
                        // stopNodes(() => { });
                    })
                }
                execFunction();

                // })
            })
        })
    }

    doMapReduce(() => console.log("MapReduce failed"));
}

distribution.node.start((server) => {
    localServer = server
    startNodes(() => {
        distribution.local.groups.put({ gid: "crawl", hash: consistentHash }, group, (e, node) => {
            distribution.crawl.groups.put({ gid: "crawl" }, group, (e, node) => {
                startTests();
            })
        })
    })
})


const hashURL = (url) => {
    return getID(url).slice(0, 20);
}

/**
 * USED FOR RUNNING LOCALLY
 */
// const startNodes = (cb) => {
//     distribution.local.status.spawn(n1, (e, node) => {
//         distribution.local.status.spawn(n2, (e, node) => {
//             distribution.local.status.spawn(n3, (e, node) => {
//                 cb();
//             });
//         });
//     });
// };
const startNodes = (cb) => {
    // cb();
    distribution.local.status.spawn(n1, (e, node) => {
        distribution.local.status.spawn(n2, (e, node) => {
            distribution.local.status.spawn(n3, (e, node) => {
                cb();
            });
        });
    });
};

const stopNodes = (cb) => {
    const remote = { service: 'status', method: 'stop' };
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, node) => {
        remote.node = n2;
        distribution.local.comm.send([], remote, (e, node) => {
            remote.node = n3;
            distribution.local.comm.send([], remote, (e, node) => {
                localServer.close();
            });
        });
    });
}