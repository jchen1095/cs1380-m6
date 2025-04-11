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
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg/"

const startTests = () => {

    // See https://edstem.org/us/courses/69551/discussion/6470553 for explanation of the
    // "require" argument
    const mapper = (key, value, require) => {
        // Import execSync
        const { execSync, spawnSync } = require("child_process");

        const resultPromise = new Promise((resolve, reject) => {
            // Step 0: Curl the URL
            const rawURLContent = execSync(`curl -skL ${value}`, { encoding: 'utf-8' })

            const capturedText = spawnSync('node', ['./c/getText.js'], {
                input: rawURLContent,
                encoding: 'utf-8'
            }).output[1];

            // Step 1: Get text from page
            // const capturedText = execSync(`./c/getText.js`, { encoding: 'utf-8' });
            // Step 2: Build up object with page data
            const data = { url: value, text: capturedText }
            // Step 3: Store content under hashURL(value)
            // console.log("key:", key);
            // Step 2: Check if capturedText is empty
            if (!capturedText) {
                console.error('Error: Captured text is empty.');
                return;  // Exit early or handle as needed
            }

            const indexed = spawnSync('bash', [`./index_map.sh`, value], { 
                input: capturedText,
                encoding: 'utf-8'
            });
            console.log('finished index test', indexed);
            distribution.local.store.put(data, { key: key, gid: 'crawl-text' }, (e, v) => {
                console.log("e:", e);
                console.log("v:", v);
                // Step 4: Get URLs from page
                const urlsRaw = spawnSync('node', [`./c/getURLs.js`, value], {
                    input: rawURLContent,
                    encoding: 'utf-8'
                }).output[1];
                // console.log("URLSRAW:", urlsRaw)
                const urlList = urlsRaw.split('\n');
                // Step 5: Go through each URL to determine which node it should be sent to
                let count = 0;
                const d = {};
                const nsidToNode = {};
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
                                        resolve([{ [key]: true }]);
                                    })
                                } else {
                                    // Use comm.send to give it to peer nodes
                                    distribution.local.comm.send(
                                        [d[nsid]],
                                        { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                                        (e, v) => {
                                            //keys need to be the ngrams of every text
                                            resolve(indexed);
                                        })
                                }
                            }
                        }
                    })
                }
            })
        })

        return resultPromise;
    }

    const reducer = (key, values) => {
        return [];
    }

    const doMapReduce = (cb) => {
        // Putting own value due to transformation which loses non-alphanumerical characters
        distribution.crawl.store.put(CRAWL_URL, hashURL(CRAWL_URL), (e, v) => {
            // console.log("e:", e);
            // console.log("v:", v);
            distribution.crawl.mr.exec({ keys: [hashURL(CRAWL_URL)], map: mapper, reduce: reducer }, (e, v) => {
                console.log("Done w/ crawl MapReduce!");
                stopNodes(() => { });
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