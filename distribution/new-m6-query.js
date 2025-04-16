const distribution = require("../distribution");
const { getSID, getID, consistentHash } = require("./util/id");

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
    // Get node for URL
    const args = process.argv[0]; // Get command-line arguments
        if (args.length < 1) {
        console.error('Usage: ./query.js [query_strings...]');
        process.exit(1);
    }
    global.distribution.crawl.store.getNode(CRAWL_URL, (e, node) => {
        // console.log("gets after getNode");
        global.distribution.local.comm.send([[CRAWL_URL]], { node: node, service: "newUrls", "method": "put" }, (e, v) => {
            // console.log("comm send crawl url worked")
            // console.log("v:", v);
            global.distribution.crawl.search.query(args, (e, v) => {
                // console.log("gets here!");
            });
        })

    })
}

distribution.node.start((server) => {
    localServer = server
    startNodes(() => {
        // console.log("start Nodes done!");
        try {
            global.distribution.local.groups.put({ gid: "queryg", hash: consistentHash }, group, (e, node) => {
                // console.log("local group put done!");
                global.distribution.queryg.groups.put({ gid: "queryg" }, group, (e, node) => {
                    // console.log("about to start tests!");
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
    global.distribution.local.status.spawn(n1, (e, node) => {
        global.distribution.local.status.spawn(n2, (e, node) => {
            global.distribution.local.status.spawn(n3, (e, node) => {
                console.log("spawned everything!");
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