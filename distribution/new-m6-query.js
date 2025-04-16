const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'outputpls.txt');

// Log "Script started"
fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] Script started\n`);

// Import modules
const distribution = require("../distribution");
const { getSID, getID, consistentHash } = require("./util/id");

const n1 = { ip: "127.0.0.1", port: 12345 };
const n2 = { ip: "127.0.0.1", port: 12346 };
const n3 = { ip: "127.0.0.1", port: 12347 };

const group = {};
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;

let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg/";

const startTests = () => {
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] start tests\n`);
    const args = process.argv.slice(2);
    if (args.length < 1) {
        fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ERROR: Usage: ./query.js [query_strings...]\n`);
        process.exit(1);
    }
    global.distribution.queryg.search.query(args, (e, v) => {
        if (e) {
            fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ERROR: Search query error: ${e}\n`);
        } else {
            fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] Search query succeeded: ${JSON.stringify(v)}\n`);
        }
    });
};

distribution.node.start((server) => {
    localServer = server;
    startNodes(() => {
        try {
            global.distribution.local.groups.put({ gid: "queryg", hash: consistentHash }, group, (e, node) => {
                fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] local group put done!\n`);
                if (e) {
                    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ERROR: Error putting local group: ${e}\n`);
                }
                global.distribution.queryg.groups.put({ gid: "queryg" }, group, (e, node) => {
                    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] about to start tests!\n`);
                    startTests();
                });
            });
        } catch (e) {
            fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] Exception encountered: ${e}\n`);
        }
    });
});

const hashURL = (url) => {
    return getID(url).slice(0, 20);
};

const startNodes = (cb) => {
    global.distribution.local.status.spawn(n1, (e, node) => {
        global.distribution.local.status.spawn(n2, (e, node) => {
            global.distribution.local.status.spawn(n3, (e, node) => {
                fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] spawned everything!\n`);
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
                if (cb) cb();
            });
        });
    });
};

// Uncomment the line below to immediately start tests when this script runs
// startTests();
