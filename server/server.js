const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { getSID, consistentHash } = require("../distribution/util/id");
const { execSync } = require('child_process');
const distribution = require("../distribution");
const path = require('path');
const app = express();
const PORT = 3001;

// allow requests from frontend on port 3000
app.use(cors());
app.use(express.json());

app.get('/search', (req, res) => {
    console.log("search endpoint hit");
    const args = req.query.q;
    console.log("query", args);
    if (!args) {
        return res.status(400).json({ error: 'Missing search query' });
    }

    try {
        // run script with search query
        // TODO point to actual script
        // currently, return a dummy result with a hardcoded url
        // const result = [
        //     { url: 'http://example.com/item1', relevancy: 0.9 },
        //     { url: 'http://example.com/item2', relevancy: 0.8 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        //     { url: 'http://example.com/item3', relevancy: 0.7 },
        // ];
        // const args = query.split(' ');
        console.log("args", args);
        // const query = req.query.q;
        // const scriptPath = path.resolve(__dirname, '../distribution/new-m6-query.js');
        // const result = execSync(`node "${scriptPath}" "${query}"`, { encoding: 'utf-8' });
        // fs.appendFileSync('debug.log', 'args are good\n');
        // console.log(result);
        
        global.distribution.queryg.search.query(args, (e, v) => {
            if (e) {
                fs.appendFileSync('debug.log', 'error\n');
                return res.json({data:[]});
            };
            console.log("gets here!");
            fs.appendFileSync('debug.log', 'query done????\n');
            // res.json(v);
            return res.json({data:v});
                
        });
        // res.json({ result });


        
    } catch (error) {
        console.error('Search script failed:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
});

const n1 = { ip: "127.0.0.1", port: 12345 }
const n2 = { ip: "127.0.0.1", port: 12346 }
const n3 = { ip: "127.0.0.1", port: 12347 }

const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;

// app.listen(PORT, () => {
//     console.log(`Backend server running on http://localhost:${PORT}`);
// });

app.on('close', () => {stopNodes})
app.on('error', () => {stopNodes})

let localServer = null;
fs.appendFileSync('debug.log', 'starting nodes....\n');
console.log("Received Request")
distribution.node.start((server) => {
    fs.appendFileSync('debug.log', 'nodes started\n');
    localServer = server
    startNodes(() => {
        fs.appendFileSync('debug.log', 'start nodes done\n');
        try {
            global.distribution.local.groups.put({ gid: "queryg", hash: consistentHash }, group, (e, node) => {
                global.distribution.queryg.groups.put({ gid: "queryg" }, group, (e, node) => {
                    app.listen(PORT, () => {
                        console.log(`Backend server running on http://localhost:${PORT}`);
                    });
                })
            })
        } catch (e) {
            stopNodes(() => {})
        }
    })
})


const startNodes = (cb) => {
    fs.appendFileSync('debug.log', 'inside startNodes\n');
    global.distribution.local.status.spawn(n1, (e, node) => {
        global.distribution.local.status.spawn(n2, (e, node) => {
            global.distribution.local.status.spawn(n3, (e, node) => {
                fs.appendFileSync('debug.log', 'spawned everything\n');
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

// startTests();