
const { getSID, getID } = require("@brown-ds/distribution/distribution/util/id")
const distribution = require("../distribution")
const { consistentHash } = require("./util/id")
const { config } = require("yargs")
const { id } = require("./util/util")

/*
Search the inverted index for a particular (set of) terms.
Usage: ./query.js your search terms

The behavior of this JavaScript file should be similar to the following shell pipeline:
grep "$(echo "$@" | ./c/process.sh | ./c/stem.js | tr "\r\n" "  ")" d/global-index.txt

Here is one idea on how to develop it:
1. Read the command-line arguments using `process.argv`. A user can provide any string to search for.
2. Normalize, remove stopwords from and stem the query string — use already developed components
3. Search the global index using the processed query string.
4. Print the matching lines from the global index file.

Examples:
./query.js A     # Search for "A" in the global index. This should return all lines that contain "A" as part of an 1-gram, 2-gram, or 3-gram.
./query.js A B   # Search for "A B" in the global index. This should return all lines that contain "A B" as part of a 2-gram, or 3-gram.
./query.js A B C # Search for "A B C" in the global index. This should return all lines that contain "A B C" as part of a 3-gram.

Note: Since you will be removing stopwords from the search query, you will not find any matches for words in the stopwords list.

The simplest way to use existing components is to call them using execSync.
For example, `execSync(`echo "${input}" | ./c/process.sh`, {encoding: 'utf-8'});`
*/


const fs = require('fs');
const {execSync, spawnSync} = require('child_process');


/**
 * USE THIS COMMAND:
 * lsof -ti :12345 | xargs kill -9 && lsof -ti :12346 | xargs kill -9 && lsof -ti :12347 | xargs kill -9
 * TO KILL ALL NODES
 */

/**
 * TODO: Change with AWS IP and Port
 */

const n1 = { ip: "18.204.217.78", port: 12345 }
const n2 = { ip: "3.82.200.164", port: 12346 }
const n3 = { ip: "3.84.211.202", port: 12347 }

const group = {}
group[getSID(n1)] = n1;
group[getSID(n2)] = n2;
group[getSID(n3)] = n3;

let localServer = null;
const CRAWL_URL = "https://atlas.cs.brown.edu/data/gutenberg"

function processQuery(args) {
    // Step 1: Read the command-line arguments
    
    const args = process.argv.slice(2); // Get command-line arguments
        if (args.length < 1) {
        console.error('Usage: ./query.js [query_strings...]');
        process.exit(1);
    }

    const queryString = args.join(' ');

    // process the string to one word per line
    const processedQuery = execSync(
        `echo "${queryString}" | ./c/process.sh | node ./c/stem.js | ./c/combine.sh`,
        { encoding: 'utf-8' }
      );
    console.log("Processed Query:", processedQuery.trim());

    return processedQuery.trim();
    //call distributed local query and be good
}

distribution.node.start((server) => {
    localServer = server
    startNodes(() => {
        distribution.local.groups.put({ gid: "queryg", hash: consistentHash }, group, (e, node) => {
            distribution.queryg.groups.put({ gid: "queryg" }, group, (e, node) => {
                const ngrams = processedQuery();
                distribution.queryg.query.query(ngrams, (e, result) => {
                });
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
    distribution.local.status.spawn(n1, (e, node) => {
        distribution.local.status.spawn(n2, (e, node) => {
            distribution.local.status.spawn(n3, (e, node) => {
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