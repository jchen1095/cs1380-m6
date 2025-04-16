const distribution = require("../distribution");
const { getSID, getID, consistentHash } = require("./util/id");
const fs = require("fs");
const { id } = require("./util/util");

const n1 = { ip: "18.204.217.78", port: 12345 }
const n2 = { ip: "3.82.200.164", port: 12346 }
const n3 = { ip: "3.84.211.202", port: 12347 }
const n4 = { ip: "54.211.11.235", port: 12348 }
const n5 = { ip: "3.83.155.20", port: 12349 }
const n6 = { ip: "3.92.183.168", port: 12350 }
const n7 = { ip: "3.92.188.88", port: 12351 }
const n8 = { ip: "52.23.233.250", port: 12352 }
const n9 = { ip: "3.87.207.172", port: 12353 }
const n10 = { ip: "54.88.232.206", port: 12354 }
const n11 = { ip: "44.204.179.65", port: 12355 }

const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;
group[getSID(n4)] = n4;
group[getSID(n5)] = n5;
group[getSID(n6)] = n6;
group[getSID(n7)] = n7;
group[getSID(n8)] = n8;
group[getSID(n9)] = n9;
group[getSID(n10)] = n10;
group[getSID(n11)] = n11;


let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg/"

const startTests = () => {
    // Get node for URL
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
}

distribution.node.start((server) => {
    localServer = server
    try {
        global.distribution.local.groups.put({ gid: "crawl", hash: consistentHash }, group, (e, node) => {
            // console.log("local group put done!");
            global.distribution.crawl.groups.put({ gid: "crawl" }, group, (e, node) => {
                // console.log("about to start tests!");
                startTests();
            })
        })
    } catch (e) {
        console.log("e???", e);
    }
    // startNodes(() => {
    //     // console.log("start Nodes done!");
    //     try {
    //         global.distribution.local.groups.put({ gid: "crawl", hash: consistentHash }, group, (e, node) => {
    //             // console.log("local group put done!");
    //             global.distribution.crawl.groups.put({ gid: "crawl" }, group, (e, node) => {
    //                 // console.log("about to start tests!");
    //                 startTests();
    //             })
    //         })
    //     } catch (e) {
    //         console.log("e???", e);
    //     }
    // })
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
            fs.closeSync(fd1);
            fs.closeSync(fd2);
            fs.closeSync(fd3);
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