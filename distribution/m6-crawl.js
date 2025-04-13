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
            // if (value === "https://atlas.cs.brown.edu/data/gutenberg//indextree.txt") {
            //     resolve({ [key]: true })
            //     return;
            // }
            // Step 0: Curl the URL
            // const rawURLContent = execSync(`curl -skL ${value}`, { encoding: 'utf-8' })

            // const capturedText = spawnSync('node', ['./c/getText.js'], {
            //     input: rawURLContent,
            //     encoding: 'utf-8'
            // }).stdout;
            var temp = {};
            // console.log("value: ", value)
            try {
                temp = spawnSync('bash', ['./jen-crawl.sh', value], {
                    encoding: 'utf-8'
                });
                // const temp = execSync(`./jen-crawl.sh ${value}`, {
                //     encoding: 'utf-8',
                //     // shell: '/bin/bash',
                //     // stdio: 'inherit',
                // });
                console.log("temp:", temp);
            } catch (e) {
                console.log("error:", e.message);
            }

            // Step 1: Get text from page
            // const capturedText = execSync(`./c/getText.js`, { encoding: 'utf-8' });
            // Step 2: Build up object with page data
            // const data = { url: value, text: temp.stdout }
            // Step 3: Store content under hashURL(value)
            // console.log("key:", key);

            // distribution.local.store.put(data, { key: key, gid: 'crawl-text' }, (e, v) => {
            // console.log("successful put in the crawl text");
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
            // console.log('Result:', result);

            var send_batch = {};
            let sid_to_node = {};
            let resultCount = 0;
            result.forEach(item => {
                // console.log(`Key: ${item.key}`);
                // console.log(`Freq: ${item.value.freq}`);
                // console.log(`URL: ${item.value.url}`);
                const ngram = item.key;
                const freq = item.value.freq;
                const url = item.value.url;
                distribution.crawl.store.getNode(ngram, (e, node) => {
                    // console.log("RETURNED FROM GETNODE!!", e, node);
                    if (e) {
                        console.log("Error getting node:", e);
                        reject(e);
                        return;
                    }
                    resultCount++;
                    const sid = distribution.util.id.getSID(node);
                    sid_to_node[sid] = node;
                    if (!Object.hasOwn(send_batch, sid)) {
                        send_batch[sid] = [];
                    }
                    send_batch[sid].push({ [ngram]: { freq: freq, url: url } });
                    // console.log("PUSHED INTO APPROPRIATE SEND BATCH!")
                    // console.log("resultCount:", resultCount)
                    // console.log(Object.keys(result).length)

                    if (resultCount === Object.keys(result).length) {
                        // console.log("We added all results, yay!")
                        let sendBatchCount = 0;
                        Object.entries(send_batch).forEach(([iterSid, piece]) => {
                            // console.log("sid:", iterSid);
                            // console.log("sid_to_node[sid]", sid_to_node[iterSid])
                            // console.log("sid_to_node:", sid_to_node)
                            console.log("PIECE:", piece);
                            distribution.local.comm.send([piece, { gid: "ngrams" }], { node: sid_to_node[iterSid], service: "store", method: "appendForBatch" }, (e, v) => {
                                sendBatchCount++;
                                if (sendBatchCount === Object.keys(send_batch).length) {
                                    // URL Parsing
                                    const sids = Object.keys(send_batch);
                                    const out = [];
                                    for (iterSid of sids) {
                                        out.push({ [send_batch[iterSid][0]]: null });
                                    }
                                    const urlsRaw = temp.stderr;
                                    // console.log("URLSRAW:", urlsRaw)
                                    const urlList = urlsRaw.split('\n');
                                    // Step 5: Go through each URL to determine which node it should be sent to
                                    let count = 0;
                                    const d = {};
                                    const nsidToNode = {};
                                    // console.log("URL LIST: ", urlList)
                                    // console.log("URL LIST LENGTH: ", urlList.length)
                                    if (urlList.length === 1 && urlList[0] === '') {
                                        // console.log("urlList[0] === ''", urlList[0] === '')
                                        // console.log("Gets")
                                        resolve(out);
                                        // return resultPromise;
                                    } else {
                                        for (const url of urlList) {
                                            distribution.crawl.store.getNode(url, (e, v) => {
                                                count++;
                                                // Add to per node batch of URLs
                                                const sid = distribution.util.id.getSID(v);
                                                if (!Object.hasOwn(d, sid)) {
                                                    d[sid] = [];
                                                }

                                                const newUrlKey = distribution.util.id.getID(url).slice(0, 20);;
                                                d[sid].push({ [newUrlKey]: url })
                                                // console.log("v NODE:", v);
                                                nsidToNode[sid] = v;
                                                // console.log("nsidToNode:", nsidToNode)
                                                if (count === urlList.length) {
                                                    // We've gone through all URLs. Let's send through the nextURLs service
                                                    for (let nsid in d) {
                                                        if (nsid === distribution.util.id.getSID(global.nodeConfig)) {
                                                            // Call own service for this
                                                            distribution.local.newUrls.put(d[nsid], (e, v) => {
                                                                resolve(out);
                                                            })
                                                        } else {
                                                            // Use comm.send to give it to peer nodes
                                                            distribution.local.comm.send(
                                                                [d[nsid]],
                                                                { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                                                                (e, v) => {
                                                                    resolve(out);
                                                                })
                                                        }
                                                    }
                                                }
                                            })
                                        }
                                    }
                                }
                            });
                        })
                    }
                });
            });
            // console.log("e:", e);
            // console.log("v:", v);
            // Step 4: Get URLs from page
            // const urlsRaw = spawnSync('node', [`./c/getURLs.js`, value], {
            //     input: rawURLContent,
            //     encoding: 'utf-8'
            // }).output[1];
            // const urlsRaw = temp.stderr;
            // // console.log("URLSRAW:", urlsRaw)
            // const urlList = urlsRaw.split('\n');
            // // Step 5: Go through each URL to determine which node it should be sent to
            // let count = 0;
            // const d = {};
            // const nsidToNode = {};
            // // console.log("URL LIST: ", urlList)
            // // console.log("URL LIST LENGTH: ", urlList.length)
            // if (urlList.length === 1 && urlList[0] === '') {
            //     // console.log("urlList[0] === ''", urlList[0] === '')
            //     // console.log("Gets")
            //     resolve([{ [key]: true }]);
            //     // return resultPromise;
            // } else {
            //     for (const url of urlList) {
            //         distribution.crawl.store.getNode(url, (e, v) => {
            //             count++;
            //             // Add to per node batch of URLs
            //             const sid = distribution.util.id.getSID(v);
            //             if (!Object.hasOwn(d, sid)) {
            //                 d[sid] = [];
            //             }

            //             const newUrlKey = distribution.util.id.getID(url).slice(0, 20);;
            //             d[sid].push({ [newUrlKey]: url })
            //             // console.log("v NODE:", v);
            //             nsidToNode[sid] = v;
            //             // console.log("nsidToNode:", nsidToNode)
            //             if (count === urlList.length) {
            //                 // We've gone through all URLs. Let's send through the nextURLs service
            //                 for (let nsid in d) {
            //                     if (nsid === distribution.util.id.getSID(global.nodeConfig)) {
            //                         // Call own service for this
            //                         distribution.local.newUrls.put(d[nsid], (e, v) => {
            //                             resolve([{ [key]: true }]);
            //                         })
            //                     } else {
            //                         // Use comm.send to give it to peer nodes
            //                         distribution.local.comm.send(
            //                             [d[nsid]],
            //                             { node: nsidToNode[nsid], service: "newUrls", method: "put" },
            //                             (e, v) => {
            //                                 resolve([{ [key]: true }]);
            //                             })
            //                     }
            //                 }
            //             }
            //         })
            //     }
            // }
            // })
        })

        return resultPromise;
    }

    const reducer = (key, values) => {
        return [];
    }

    const doMapReduce = (cb) => {
        // Putting own value due to transformation which loses non-alphanumerical characters
        global.distribution.crawl.store.getNode(CRAWL_URL, (e, v) => {
            if (e) {
                cb(e);
                return;
            }
            // console.log("does getNode return?");
            global.distribution.local.comm.send([{ [hashURL(CRAWL_URL)]: CRAWL_URL }], { node: v, service: "newUrls", "method": "put" }, (e, v) => {
                // console.log("does this get sent?");
                // console.log("newUrls put e:", e);
                // console.log("newUrls put v:", v);
                if (e) {
                    cb(e);
                    return;
                }
                // distribution.crawl.store.put(CRAWL_URL, hashURL(CRAWL_URL), (e, v) => {
                //     if(e) {
                //         cb(e);
                //         return;
                //     }
                // console.log("e:", e);
                // console.log("v:", v);
                const execFunction = () => {
                    distribution.crawl.mr.exec({ keys: [null], map: mapper, reduce: reducer }, (e, v) => {
                        console.log("do we ever get back to here?")
                        global.distribution.crawl.comm.send([], { service: "newUrls", method: "flush" }, (e, v) => {
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
                                counts = Object.values(vs).map((v) => v.count);
                                sum = counts.reduce((acc, curr) => acc + curr, 0);
                                console.log("[MR ITERATION] Count: " + sum);
                                const notDone = Object.values(vs).filter((v) => !v.isDone);
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
        distribution.local.groups.put({ gid: "crawl", hash: consistentHash }, group, (e, v) => {
            distribution.crawl.groups.put({ gid: "crawl" }, group, (e, v) => {
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
    distribution.local.status.spawn(n1, (e, v) => {
        distribution.local.status.spawn(n2, (e, v) => {
            distribution.local.status.spawn(n3, (e, v) => {
                cb();
            });
        });
    });
};

const stopNodes = (cb) => {
    const remote = { service: 'status', method: 'stop' };
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n2;
        distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n3;
            distribution.local.comm.send([], remote, (e, v) => {
                localServer.close();
            });
        });
    });
}