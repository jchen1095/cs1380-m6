
const { getSID, getID } = require("@brown-ds/distribution/distribution/util/id")
const distribution = require("../distribution")
const { consistentHash } = require("./util/id")
const { config } = require("yargs")

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
        console.log("Mapper key:", key);
        console.log("Mapper value:", value);
        console.log(value);
        // Import execSync
        const { execSync, spawnSync, exec } = require("child_process");

        const resultPromise = new Promise((resolve, reject) => {
         
            var temp = {};
            // console.log("value: ", value)
            try {
                temp = spawnSync('bash', ['./jen-crawl.sh', value], {
                    encoding: 'utf-8',
                    maxBuffer: 1024 * 1024 * 64
                });
               
                console.log("temp:", temp);
            } catch (e) {
                console.log("error:", e.message);
            }

            // Step 1: Get text from page
            // const capturedText = execSync(`./c/getText.js`, { encoding: 'utf-8' });
            // Step 2: Build up object with page data
            const data = { url: value, text: temp.stdout }
            // Make an array of data objects of key value entries
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
            console.log('Result:',result);
            
            var send_batch = {};
            result.forEach(item => {
                console.log(`Key: ${item.key}`);
                console.log(`Freq: ${item.value.freq}`);
                console.log(`URL: ${item.value.url}`);
                const ngram = item.key;
                const freq = item.value.freq;
                const url = item.value.url;
                const sid_to_node = {};
                global.distribution.crawl.store.getNode(ngram, (e, node) => {
                    if (e) {
                        console.log("Error getting node:", e);
                        return;
                    }
                    const sid = distribution.util.id.getSID(node);
                    sid_to_node[sid]=node;
                    if (!Object.hasOwn(send_batch, sid)) {
                        send_batch[node] = [];
                    }
                    send_batch[sid].push({ngram: {freq: freq, url: url}});

                });
              });

            send_batch.forEach((sid, piece) => {
                distribution.local.comm.send([piece, { gid: "ngrams" }], { node: sid_to_node[sid], service: "store", method: "appendForBatch"}, (e, v) => {

                });

            })
            // We need to resolve the promise with the trick key
            const sids = Object.keys(send_batch);
            const out = [];
            for (sid of sids) {
                out.push({ [send_batch[sid][0]]: null });
            }
            resolve(out);

            
            
            
        //     distribution.local.comm.send(
        //         [d[nsid]],
        //         { node: nsidToNode[nsid], service: "newUrls", method: "put" },
        //         (e, node) => {
        //             resolve(result);
        //         })
        // }
            // const nid = _getNodeIdForKey(key);
            // const nodeToSendKeyTo = context.group[nid.substring(0, 5)];

            distribution.local.store.put(data, { key: key, gid: 'crawl-text' }, (e, node) => {
                console.log("successful put in the crawl text");
                
                const urlsRaw = temp.stderr;
                // console.log("URLSRAW:", urlsRaw)
                const urlList = urlsRaw.split('\n');
                // Step 5: Go through each URL to determine which node it should be sent to
                let count = 0;
                const d = {};
                const nsidToNode = {};
                console.log("URL LIST: ", urlList)
                console.log("URL LIST LENGTH: ", urlList.length)
                if (urlList.length === 1 && urlList[0] === '') {
                    // console.log("urlList[0] === ''", urlList[0] === '')
                    // console.log("Gets")
                    resolve(result);
                        // return resultPromise;
                } else {
                    for (const url of urlList) {
                        distribution.crawl.store.getNode(url, (e, node) => {
                            count++;
                            // Add to per node batch of URLs
                            const sid = distribution.util.id.getSID(node);
                            if (!Object.hasOwn(d, sid)) {
                                d[sid] = [];
                            }

                            const newUrlKey = distribution.util.id.getID(url).slice(0, 20);;
                            d[sid].push({ [newUrlKey]: url })
                            // console.log("node NODE:", node);
                            nsidToNode[sid] = node;
                            // console.log("nsidToNode:", nsidToNode)
                            if (count === urlList.length) {
                                // We've gone through all URLs. Let's send through the nextURLs service
                                for (let nsid in d) {
                                    if (nsid === distribution.util.id.getSID(global.nodeConfig)) {
                                        // Call own service for this
                                        distribution.local.newUrls.put(d[nsid], (e, node) => {
                                            resolve([{ [key]: true }]);
                                        })
                                    } else {
                                        // Use comm.send to give it to peer nodes
                                        distribution.local.comm.send(
                                            [d[nsid]],
                                            { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                                            (e, node) => {
                                                resolve(result);
                                            })
                                    }
                                }
                            }
                        })
                    }
                }
            })
        })

        return resultPromise;
    }

    const reducer = (key, values) => {
        console.log("Reducer key:", key);
        console.log("Reducer value:", values);
        // Import execSync
        const { execSync, spawnSync, exec } = require("child_process");

        const resultPromise = new Promise((resolve, reject) => {
            
            var temp = {};
            // console.log("value: ", value)
            try {
                temp = spawnSync('bash', ['./index_reduce.sh', values], {
                    encoding: 'utf-8',
                    maxBuffer: 1024 * 1024 * 64
                });
                
                console.log("[reduce] temp:", temp);
            } catch (e) {
                console.log("[reduce] error:", e.message);
            }

            // Step 1: Get text from page
            // const capturedText = execSync(`./c/getText.js`, { encoding: 'utf-8' });
            // Step 2: Build up object with page data
            const data = temp.stdout;
            console.log(data);
            distribution.local.store.put(data, { key: key, gid: 'crawl-text' }, (e, node) => {
                if (e) {
                    console.log(e);
                    reject(e);
                    return;
                }
                console.log('[reduce] ran:', node);
                resolve([{ [key]: true }]);
            });
            // Step 3: Store content under hashURL(value)
            // console.log("key:", key);
            
            
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
                    distribution.crawl.mr.exec({ keys: [null], map: mapper, reduce: reducer }, (e, node) => {
                        console.log("do we ever get back to here?")
                        global.distribution.crawl.comm.send([], {service: "newUrls", method: "flush"}, (e,node) => {
                            if (e.length > 0) {
                                console.log("FLUSH FAILED...");
                                return;
                            }
                            console.log("FLUSHED");
                            global.distribution.crawl.comm.send([], { service: "newUrls", method: "status" }, (es, vs) => {
                                console.log("vs:", vs);
                                console.log("es:", es);
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

    doMapReduce();
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
const startNodes = (cb) => {
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