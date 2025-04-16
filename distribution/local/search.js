const fs = require("fs");
const { execSync, spawnSync } = require("child_process");
const { id } = require("../util/util");


let currIters = 0;
const CAP = 30; // number of allowable concurrent execs per node

function start(gid, callback) {
    try {
        setInterval(() => {
            if (currIters < CAP) {
                _poll(gid);
            }
        }, 10);
        // console.log("successfully set interval for poll!")
        callback(null, true);
    } catch (e) {
        console.log("error from staert:", e);
    }
}

function _poll(gid) {
    global.distribution.local.newUrls.get((e, v) => {
        if (e) {
            console.log("No URL was polled!");
            return;
        }
        if (v === '') {
            console.log("Empty URL was polled; exiting.")
            return;
        }
        changeCount(1);
        // console.log("About to call crawl with URL: ", v);
        global.distribution.local.search.crawl({ gid: gid, url: v }, (e, v) => {
            // Do something to stop polling maybe?
        })
    })
}

function crawl(config, callback) {
    let scriptOutput;
    const { url, gid } = config;
    console.log("[CRAWLING]", url);
    try {
        scriptOutput = spawnSync('bash', ['jen-crawl.sh', url], {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024 * 64
        });
    } catch (e) {
        console.log("error:", e.message);
        return;
    }

    _processURLs(scriptOutput);
    if (url.includes(".txt")) {
        _processDocs(scriptOutput);
    } else {
        changeCount(-1);
    }
    console.log(id.getSID(global.nodeConfig) + ': call: ' + currIters);
    // console.log("scriptOutput", scriptOutput);
    callback(null, true);
}


const _processURLs = (scriptOutput) => {
    const urlsRaw = scriptOutput.stderr;
    const urlList = urlsRaw.split('\n');

    let urlCount = 0;
    const sidToURLList = {};
    const nsidToNode = {};

    // Add next URLs
    for (const rawUrl of urlList) {
        // console.log("rawURL:", rawUrl)
        global.distribution.crawl.store.getNode(rawUrl, (e, nodeToSend) => {
            urlCount++;
            // Add to per node batch of URLs
            const sid = distribution.util.id.getSID(nodeToSend);
            if (!Object.hasOwn(sidToURLList, sid)) {
                sidToURLList[sid] = [];
            }

            // const newUrlKey = global.distribution.util.id.getID(rawUrl).slice(0, 20);
            sidToURLList[sid].push(rawUrl)
            nsidToNode[sid] = nodeToSend;

            if (urlCount === urlList.length) {
                // let nodesReceivingURLList = 0;
                // We've gone through all URLs. Let's send through the nextURLs service
                for (let nsid in sidToURLList) {
                    if (nsid === global.distribution.util.id.getSID(global.nodeConfig)) {
                        global.distribution.local.newUrls.put(
                            sidToURLList[nsid],
                            (e, v) => { }
                        )
                    } else {
                        global.distribution.local.comm.send(
                            [sidToURLList[nsid]],
                            { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                            (e, v) => { }
                        )
                    }
                }
            }
        })
    }
}

const _processDocs = (scriptOutput) => {
    const result = scriptOutput.stdout.trim()
        .split("\n")
        .map(line => {
            const [ngram, freq, url] = line.split("|").map(s => s.trim());
            return {
                key: ngram,
                value: {
                    freq: parseInt(freq, 10),
                    url: url
                }
            };
        });

    result.map(item => {
        const ngram = item.key;
        const freq = item.value.freq;
        const url = item.value.url;
        return { [ngram]: { freq: freq, url: url } }
    })
    distribution.local.store.appendForBatch([ngramInfo], { gid: "ngrams" }, (e, v) => {
        if (e) {
            console.log("Error in append for batch: ", e);
        }
        changeCount(-1);
    })
};

const query = (args) => {
    fs.appendFileSync('debug.log', '=QUERY=\n');
    // Step 1: Read the command-line arguments
    
    // const args = process.argv.slice(2); // Get command-line arguments
    //     if (args.length < 1) {
    //     console.error('Usage: ./query.js [query_strings...]');
    //     process.exit(1);
    // }
    //input is a string
    const queryString = args;
    fs.appendFileSync('debug.log', queryString);

    // process the string to one word per line
    const finalQueryUrls = {};
    const processedQuery = execSync(
        `echo "${queryString}" | ./c/process.sh | node ./c/stem.js | ./c/combine.sh`,
        { encoding: 'utf-8' }
      ).trim();
    console.log("Processed Query:", processedQuery.trim());

    distribution.local.query.query(processedQuery, (e, result) => {
        if (e) {
            console.log("Error in query: ", e);
            return;
        }
        console.log("Query result: ", result);
        distribution.local.newUrls.status( (e,amt_of_docs)=> {
            if (e) {
                console.log("Error in getting the idf: ", e);
                return;
            }
            console.log("idf", amt_of_docs);
        
            results.forEach(entry => {
                const ngram = Object.keys(entry)[0]; // key of ngram "best book"
                const value = entry[ngram];          // value object of arrays of url objs
                const length = ngram.split(' ').length;; // count the words in the ngram
                const num_docs_returned = value.length;
                const idf = Math.log(1 + (amt_of_docs/(1+num_docs_returned)));
                value.forEach((obj, indx) => {
                    const url = obj.url;
                    const freq = obj.freq;
                    console.log(`N-gram: "${ngram}" (${length}-gram)`);
                    console.log("Value:", value);

                    const tfidf = freq * idf;
                    if (!finalQueryUrls.has(url)) {
                        // url is not in the map
                        finalQueryUrls[url] = 0;
                    }
                    //log total num docs/ num docs for the specific ngram appears 
                    finalQueryUrls[url] += length * tfidf;
                    
                });
            });            


        });
    });
    const resultArray = Object.entries(finalQueryUrls).map(([url, score]) => {
        return { [url]: score };
    });
    
    console.log("Final weighted URLs:", resultArray);

    return resultArray;
}


module.exports = { crawl, start, query }
