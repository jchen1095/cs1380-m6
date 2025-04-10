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
        const { execSync } = require("child_process");

        const resultPromise = new Promise((resolve, reject) => {
            // Step 1: Get text from page
            const capturedText = execSync(`./getText.js`, { encoding: 'utf-8' });
            // Step 2: Build up object with page data
            const data = { url: value, text: capturedText }
            // Step 3: Store content under hashURL(value)
            distribution.local.store.put(data, { key: key, gid: 'crawl-text' }, (e, v) => {
                // Step 4: Get URLs from page
                const urlsRaw = execSync('./getURLs.js', { encoding: 'utf-8' });
                const urlList = urlsRaw.split('\n');
                // Step 5: Go through each URL to determine which node it should be sent to
                let count = 0;
                const d = {};
                for (let url in urlList) {
                    const nsidToNode = {};
                    distribution.crawl.store.getNode(url, (e, v) => {
                        count++;
                        // Add to per node batch of URLs
                        const sid = getSID(v);
                        if (!Object.hasOwn(d, sid)) {
                            d[sid] = [];
                        }
                        d[sid].push({ key: url })
                        nsidToNode[sid] = v;
                        if (count === urlList.length) {
                            // We've gone through all URLs. Let's send through the nextURLs service
                            for (let nsid in d) {
                                if (nsid === getSID(global.nodeConfig)) {
                                    // Call own service for this
                                    distribution.local.nextUrls.put(d[nsid], (e, v) => {
                                        resolve([{ [key]: true }]);
                                    })
                                } else {
                                    // Use comm.send to give it to peer nodes
                                    distribution.local.comm.send(
                                        [nextUrls],
                                        { node: nsidToNode[nsid], service: "nextUrls", method: "put" },
                                        (e, v) => {
                                            resolve({ [key]: true });
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