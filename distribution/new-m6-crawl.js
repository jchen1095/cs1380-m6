const distribution = require("../distribution");
const { getSID, getID, consistentHash } = require("./util/id");
const fs = require("fs");
const { id } = require("./util/util");

const n1 = { ip: "127.0.0.1", port: 12345 }
const n2 = { ip: "127.0.0.1", port: 12346 }
const n3 = { ip: "127.0.0.1", port: 12347 }

const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;

let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg/2/8/6/"

const startTests = () => {
    // Get node for URL
    global.distribution.crawl.comm.send([['https://atlas.cs.brown.edu/data/gutenberg/books.txt', 'https://atlas.cs.brown.edu/data/gutenberg/indextree.txt']], {service:'newUrls', method: 'blacklist'}, (e,v) => {
        global.distribution.crawl.store.getNode(CRAWL_URL, (e, node) => {
            // console.log("gets after getNode");
            global.distribution.local.comm.send([[CRAWL_URL]], { node: node, service: "newUrls", "method": "put" }, (e, v) => {
                // console.log("comm send crawl url worked")
                // console.log("v:", v);
                global.distribution.crawl.search.start((e, v) => {
                    // console.log("gets here!");
                });
            })

        })
    })
    
}

distribution.node.start((server) => {
    localServer = server
    startNodes(() => {
        // console.log("start Nodes done!");
        try {
            global.distribution.local.groups.put({ gid: "crawl", hash: consistentHash }, group, (e, node) => {
                // console.log("local group put done!");
                global.distribution.crawl.groups.put({ gid: "crawl" }, group, (e, node) => {
                    console.log("about to start tests!");
                    startTests();
                })
            })
        } catch (e) {
            console.log("e???", e);
        }
    })
})


const hashURL = (url) => {
    return getID(url).slice(0, 20);
}

const startNodes = (cb) => {
    // console.log("hi??");
    global.distribution.local.status.spawn(n1, (e, node) => {
        // console.log("spawn n1");
        global.distribution.local.status.spawn(n2, (e, node) => {
            global.distribution.local.status.spawn(n3, (e, node) => {
                console.log("spawned everything!");
                // Create all necessary files
                makeTxtFiles();
                console.log("hi??");
                cb();
            });
        });
    });
};

const makeTxtFiles = () => {
    try {
        for (let sid of Object.keys(group)) {
            const fd1 = fs.openSync(`./d/${sid}-visited.txt`, 'w');
            const fd2 = fs.openSync(`./${sid}-url-queue.txt`, 'w');
            const fd3 = fs.openSync(`./d/${sid}-docCount.txt`, 'w');
            const fd4 = fs.openSync(`./d/${sid}-totalCount.txt`, 'w');
            fs.closeSync(fd1);
            fs.closeSync(fd2);
            fs.closeSync(fd3);
            fs.closeSync(fd4);
        }
    } catch (e) {
        console.log("Error while opening visited and URL queue files.", e);
    }
}

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

process.on('SIGINT', async () => {
    global.distribution.crawl.comm.send([], { service: "search", method: "stop"}, (e, v) => {
        stopNodes((e, v) => {
            console.log('Flushed. Goodbye.');
            process.exit(0);
        });
    })
  });