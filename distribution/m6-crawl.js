const { getSID, getID } = require("@brown-ds/distribution/distribution/util/id")
const distribution = require("../distribution")
const { consistentHash } = require("./util/id")

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
            const out = {};
            try {
                // Step 2: Retrieve text from page
                const capturedText = execSync(`./crawl.sh ${value}`, { encoding: 'utf-8'} );

                // Step 3: Store text for one node (for now just do it in the same folder)
                distribution.crawl.store.put(capturedText, `${key}-text`, (e, v) => {
                    // Value doesn't matter; what matters here is that we stored the text
                    out[value] = true;
                    resolve(out);
                })
            } catch (e) {
                console.log("Something went wrong while trying to run execSync:", e);
            }
        })

        return resultPromise;
        // Step 1: Retrieve URLs from page
        // Step 4: Store URLs in the base folder to be able to start a MR again
        // Return a promise which will be resolved at the end of the put callback

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