const fs = require('fs');
fs.appendFileSync('debug.log', '=== Script started ===\n');
const distribution = require("../distribution");
const { getSID, getID, consistentHash } = require("./util/id");

const n1 = { ip: "127.0.0.1", port: 12345 }
const n2 = { ip: "127.0.0.1", port: 12346 }
const n3 = { ip: "127.0.0.1", port: 12347 }
const n4 = { ip: "127.0.0.1", port: 12348 }
const n5 = { ip: "127.0.0.1", port: 12349 }


const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;
group[getSID(n4)] = n4;
group[getSID(n5)] = n5;

let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg/"


const startTests = (callback) => {
    fs.appendFileSync('debug.log', 'Hit startTests()\n');

    const queries = [
        "gutenberg project", "donate howto", "visit library", "book reading", "project gutenberg",
        "free books", "public domain", "literary works", "classic novels", "open access",
        "text files", "ebook formats", "book download", "english literature", "digital archive",
        "read online", "audio books", "educational resource", "literature search", "gutenberg volunteers",
        "automated extraction", "scanned books", "optical recognition", "text conversion", "machine learning",
        "metadata tagging", "book categorization", "information retrieval", "web crawling", "text indexing",
        "tf-idf weighting", "ngram extraction", "text search", "stemmed query", "lemmatization",
        "search engine", "distributed system", "peer nodes", "fault tolerance", "local storage",
        "document frequency", "term frequency", "query result", "relevance ranking", "information gain",
        "document corpus", "query optimization", "natural language", "text corpus", "query analysis"
    ];

    const latencies = [];
    let completed = 0;
    const startTime = performance.now();

    queries.forEach((queryStr, index) => {
        const queryStart = performance.now();
        console.log(queryStr);
        global.distribution.queryg.search.query(args=queryStr, (e, v) => {
            const queryEnd = performance.now();
            const latency = queryEnd - queryStart;
            latencies.push(latency);

            if (e) {
                fs.appendFileSync('debug.log', `Error in query ${index + 1}: ${e}\n`);
            }

            completed++;
            
            if (completed === queries.length) {
                const endTime = performance.now();
                const totalTime = endTime - startTime; // in milliseconds

                const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                const throughput = (queries.length / totalTime) * 1000; // queries/sec

                fs.appendFileSync('debug.log', `\n--- Performance Metrics ---\n`);
                fs.appendFileSync('debug.log', `Total Time: ${totalTime.toFixed(2)} ms\n`);
                fs.appendFileSync('debug.log', `Average Latency: ${avgLatency.toFixed(2)} ms\n`);
                fs.appendFileSync('debug.log', `Throughput: ${throughput.toFixed(2)} queries/sec\n`);

                console.log("\n--- Performance Metrics ---");
                console.log(`Total Time: ${totalTime.toFixed(2)} ms`);
                console.log(`Average Latency: ${avgLatency.toFixed(2)} ms`);
                console.log(`Throughput: ${throughput.toFixed(2)} queries/sec`);

                callback(null, {
                    totalTime,
                    avgLatency,
                    throughput
                });
            }
        });
    });
};

fs.appendFileSync('debug.log', 'starting nodes....\n');
distribution.node.start((server) => {
    fs.appendFileSync('debug.log', 'nodes started\n');
    localServer = server
    startNodes(() => {
        fs.appendFileSync('debug.log', 'start nodes done\n');
        // console.log("start Nodes done!");
        try {
            global.distribution.local.groups.put({ gid: "queryg", hash: consistentHash }, group, (e, node) => {
                // console.log("local group put done!");
                global.distribution.queryg.groups.put({ gid: "queryg" }, group, (e, node) => {
                    // console.log("about to start tests!");
                    fs.appendFileSync('debug.log', 'about to start tests\n');
                    startTests((err, result) => {
                        fs.appendFileSync('debug.log', 'Start tests finished!\n');
                        if (err) {
                            fs.appendFileSync('debug.log', `Error: ${err}\n`);
                        } else {
                            fs.appendFileSync('debug.log', `Got result: ${JSON.stringify(result)}\n`);
                        }
                    });
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
    fs.appendFileSync('debug.log', 'inside startNodes\n');
    global.distribution.local.status.spawn(n1, (e, node) => {
        global.distribution.local.status.spawn(n2, (e, node) => {
            global.distribution.local.status.spawn(n3, (e, node) => {
                global.distribution.local.status.spawn(n4, (e, node) => {
                    global.distribution.local.status.spawn(n5, (e, node) => {
                        console.log("spawned everything!");
                        fs.appendFileSync('debug.log', 'spawned everything\n');
                        cb();
                    });
                 });
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

// startTests();