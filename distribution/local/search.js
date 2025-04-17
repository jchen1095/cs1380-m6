const fs = require("fs");
const { execSync, spawnSync } = require("child_process");
const { id } = require("../util/util");


let currIters = 0;
let stopRequested = false;
const CAP = 15; // number of allowable concurrent execs per node

function start(gid, callback) {
    try {
        setInterval(async () => {
            if (currIters < CAP) {
                _poll(gid);
            }
        }, 10);
        // console.log("successfully set interval for poll!")
        callback(null, true);
    } catch (e) {
        console.log("error from start:", e);
    }
}

async function stop(callback) {
    stopRequested = true;

    global.distribution.local.index.flushAllWrites().then(() => {
        callback(null, true);
    })
}

function _poll(gid) {
    if (stopRequested) {
        return;
    }
    global.distribution.local.newUrls.get((e, v) => {
        if (e) {
            // console.log("No URL was polled!");
            return;
        }
        if (v === '') {
            // console.log("Empty URL was polled; exiting.")
            return;
        }
        changeCount(1);
        // console.log("About to call crawl with URL: ", v);
        global.distribution.local.search.crawl({ gid: gid, url: v }, async (e, v) => {
            // Do something to stop polling maybe?
        })
    })
}

async function crawl(config, callback) {
    let scriptOutput;
    const { url, gid } = config;
    console.log("[CRAWLING]", url);
    let count;
    try {
        const wcFilepath = 'd/'+ id.getSID(global.nodeConfig) + '-wc.txt';
        // const startTime = performance.now();
        if (url.endsWith(".txt")) {
            const wc = fs.openSync(wcFilepath, 'w+');
            scriptOutput = spawnSync('bash', ['jen-crawl.sh', url], {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 64,
                stdio: ['pipe', 'pipe', 'pipe', wc],
            });
            fs.closeSync(wc);
            count = parseInt(fs.readFileSync(wcFilepath, 'utf-8').trim());
            if (!count) {
                console.log("[CRAWLER] Error: No word count retrieved. Exiting");
                changeCount(-1);
                callback(new Error("[CRAWLER] error: no word count retrieved"), false);
                return;
            }
        } else {
            scriptOutput = spawnSync('bash', ['jen-crawl-small.sh', url], {
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 64,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        }
        // console.log("COUNT:", count);
        // const endTime = performance.now();
        // console.log("Running jen-crawl took:", endTime-startTime)

    } catch (e) {
        console.log("error:", e.message);
        changeCount(-1);
        callback(new Error("[CRAWLER] error: ", e.message), false);
        return;
    }
    incrementTotalCount();
    _processURLs(scriptOutput);
    if (url.includes(".txt")) {
        _processDocs(scriptOutput, count);
        // console.log("Processed docs!");
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

const _processDocs = async (scriptOutput, wc) => {
    // console.log("[CRAWLER] Processing documents...");
    const result = scriptOutput.stdout.trim().split('\n').map(line => {
            const [ngram, freq, url] = line.split("|").map(s => s.trim());
            return { [ngram]: { freq: parseInt(freq, 10)/wc, url: url } }
        });
    
    // console.log("Sending to store...");
    global.distribution.local.index.appendIndex(result, (e,v) => {
        // console.log("finished writing to store!");
        changeCount(-1);
        if (e) {
            console.log("Error in append: ", e);
            return;
        }
        incrementDocumentCount();
    })
};

function changeCount(change) {
    currIters += change;  
    // console.log("currIters:", currIters);
}

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

function incrementDocumentCount() {
    const docCount = 'd/'+ id.getSID(global.nodeConfig) + '-docCount.txt';
    let count;
    try {
        count = parseInt(fs.readFileSync(docCount, 'utf-8').trim());
        if (isNaN(count)) {
            count = 0;
        }
    } catch(e) {
        count = 0
    }
    fs.writeFileSync(docCount, (count + 1).toString());
    // console.log("incremented doc count to:", count + 1);
    return;
}

function incrementTotalCount() {
    const totalCount = 'd/'+ id.getSID(global.nodeConfig) + '-totalCount.txt';
    let count;
    try {
        count = parseInt(fs.readFileSync(totalCount, 'utf-8').trim());
        if (isNaN(count)) {
            count = 0;
        }
    } catch(e) {
        count = 0
    }
    fs.writeFileSync(totalCount, (count + 1).toString());
    // console.log("incremented total count to:", count + 1);
    return;
}

// function query(args, numDocs, callback){
//     console.log('in local query', args);

//     // Step 1: Read the command-line arguments
    
//     // const args = process.argv.slice(2); // Get command-line arguments
//     //     if (args.length < 1) {
//     //     console.error('Usage: ./query.js [query_strings...]');
//     //     process.exit(1);
//     // }
//     //input is a string
//     // const queryString = args;

//     // process the string to one word per line
//     const finalQueryUrls = {};
    
//         // Build the command string:
//         // Surround each script's absolute path in double quotes
//         // and ensure proper spacing around pipe operators.
//         // const processScript = path.join(__dirname, '../../non-distribution', 'c', 'process.sh');
//         // const stemScript = path.join(__dirname, '../../non-distribution', 'c','stem.js');
//         // const combineScript = path.join(__dirname, '../../non-distribution', 'c','combine.sh');
    
//     // Execute the pipeline in bash
//     let processedQuery;
//     try {
//         processedQuery = spawnSync('bash', ['-c', 'echo "amor txt"| ./c/process.sh | node ./c/stem.js | ./c/combine.js'], {
//             encoding: 'utf-8'
//         }).stdout;        
        
//     } catch (e) {
//         console.log("the error!: ", e.message);
//         callback(new Error("[QUERY] Error in calculating n-grams: ", e.message));
//         return;
//     }
    
//     // console.log("Processed Query:", processedQuery.trim());
//     // console.log("pre processed")
//     global.distribution.local.query.process(processedQuery.trim(), (e, result) => {
//         // console.log('processed');
//         if (e) {
//             console.log("[QUERY] Error in processing query: ", e.message);
//             callback(new Error("[QUERY] Error in processing query: ", e.message), null);
//             return;
//         }
//         console.log("Query result: ", result);
//         // console.log('hello')
//         // result.forEach(r => console.log(r));
//         callback(null, result);
//         // try {
//         //     // console.log("totalDocs", numDocs);
//         //     // result.forEach(entry => {
//         //     //     let ngram_pls = Object.keys(entry)[0]; // key of ngram "best book"
//         //     //     let value = entry[ngram_pls];          // value object of arrays of url objs
//         //     //     let length = ngram_pls.split(' ').length;; // count the words in the ngram
//         //     //     let idf = Math.log(numDocs/value.length); 
//         //     //     value.forEach(obj => {
//         //     //         console.log("obj", obj)
//         //     //         let url = obj.url;
//         //     //         let freq = obj.freq;
//         //     //         console.log(`N-gram: "${ngram_pls}" (${length}-gram)`);
//         //     //         console.log("Value:", value);

//         //     //         if (!(url in finalQueryUrls)) {

//         //     //             // url is not in the map
//         //     //             finalQueryUrls[url] = 0;
//         //     //         }
//         //     //         //log total num docs/ num docs for the specific ngram appears 
//         //     //         finalQueryUrls[url] += length * freq * idf;
                    
//         //     //     });
//         //     // });            
//         //     let resultArray = Object.entries(finalQueryUrls).map(([url, score]) => {
//         //         console.log("URL,", url)
//         //         console.log("SORCE:", score)
//         //         return { [url]: score };
//         //     });
            
//         //     console.log("Final weighted URLs:", resultArray);
//         //     callback(null, resultArray);
//         // } catch(e) {
//         //     console.log('ERROR in local query');
//         //     callback(new Error("[Local.Query] Error:", e.message))
//         // }
        
//     });
    
// }


module.exports = { crawl, start, stop }
