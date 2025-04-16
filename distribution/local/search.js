const fs = require("fs");
const { spawnSync } = require("child_process");
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
        console.log("error from start:", e);
    }
}

function _poll(gid) {
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
        global.distribution.local.search.crawl({ gid: gid, url: v }, (e, v) => {
            // Do something to stop polling maybe?
        })
    })
}

function crawl(config, callback) {
    let scriptOutput;
    const { url, gid } = config;
    console.log("[CRAWLING]", url);
    let count;
    try {
        const wcFilepath = 'd/'+ id.getSID(global.nodeConfig) + '-wc.txt';
        const wc = fs.openSync(wcFilepath, 'w+');
        scriptOutput = spawnSync('bash', ['jen-crawl.sh', url], {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024 * 64,
            stdio: ['pipe', 'pipe', 'pipe', wc],
        });
        count = parseInt(fs.readFileSync(wcFilepath, 'utf-8').trim());
        console.log("COUNT:", count);
        fs.closeSync(wc);
        if (!count) {
            console.log("[CRAWLER] Error: No word count retrieved. Exiting");
            changeCount(-1);
            callback(new Error("[CRAWLER] error: no word count retrieved"), false);
            return;
        }
    } catch (e) {
        console.log("error:", e.message);
        changeCount(-1);
        callback(new Error("[CRAWLER] error: ", e.message), false);
        return;
    }

    _processURLs(scriptOutput);
    if (url.includes(".txt")) {
        _processDocs(scriptOutput, count);
        console.log("Processed docs!");
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

const _processDocs = (scriptOutput, wc) => {
    console.log("[CRAWLER] Processing documents...");
    const result = scriptOutput.stdout.trim().split('\n').map(line => {
            const [ngram, freq, url] = line.split("|").map(s => s.trim());
            return { [ngram]: { freq: parseInt(freq, 10)/wc, url: url } }
        });
    
    console.log("Sending to store...");
    distribution.local.store.appendForBatch(result, { gid: "ngrams" }, (e, v) => {
        console.log("finished writing to store!");
        changeCount(-1);
        if (e) {
            console.log("Error in append for batch: ", e);
            return;
        }
        
        incrementDocumentCount();
    })
};

function changeCount(change) {
    currIters += change;  
    console.log("currIters:", currIters);
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
    console.log("incremented doc count to:", count + 1);
    return;
}

function query(args, callback){
    console.log('in local query', args);

    // Step 1: Read the command-line arguments
    
    // const args = process.argv.slice(2); // Get command-line arguments
    //     if (args.length < 1) {
    //     console.error('Usage: ./query.js [query_strings...]');
    //     process.exit(1);
    // }
    //input is a string
    // const queryString = args;

    // process the string to one word per line
    const finalQueryUrls = {};
    
        // Build the command string:
        // Surround each script's absolute path in double quotes
        // and ensure proper spacing around pipe operators.
        // const processScript = path.join(__dirname, '../../non-distribution', 'c', 'process.sh');
        // const stemScript = path.join(__dirname, '../../non-distribution', 'c','stem.js');
        // const combineScript = path.join(__dirname, '../../non-distribution', 'c','combine.sh');

    const command = `echo`;
    // Execute the pipeline in bash
    let processedQuery;
    try {
        processedQuery = spawnSync('bash', ['-c', 'echo "gutenberg visited my house"| ./c/process.sh | node ./c/stem.js | ./c/combine.js'], {
            encoding: 'utf-8'
        }).stdout;        
        
    } catch (e) {
        console.log("the error!: ", e);
        return;
    }
    
    // console.log("Processed Query:", processedQuery.trim());

    distribution.local.query.process(processedQuery.trim(), (e, result) => {
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
            let idf_count = amt_of_docs.count;
            result.forEach(entry => {
                let ngram_pls = Object.keys(entry)[0]; // key of ngram "best book"
                let value = entry[ngram_pls];          // value object of arrays of url objs
                let length = ngram_pls.split(' ').length;; // count the words in the ngram
                let num_docs_returned = value.length;
                let idf = Math.log(1 + (idf_count/(1+num_docs_returned)));
                value.forEach((obj, indx) => {
                    let url = obj.url;
                    let freq = obj.freq;
                    console.log(`N-gram: "${ngram_pls}" (${length}-gram)`);
                    console.log("Value:", value);

                    let tfidf = freq * idf;
                    if (!(url in finalQueryUrls)) {

                        // url is not in the map
                        finalQueryUrls[url] = 0;
                    }
                    //log total num docs/ num docs for the specific ngram appears 
                    finalQueryUrls[url] += length * tfidf;
                    
                });
            });            
            let resultArray = Object.entries(finalQueryUrls).map(([url, score]) => {
                return { [url]: score };
            });
            
            console.log("Final weighted URLs:", resultArray);
        
            return resultArray;

        });
    });
    
}


module.exports = { crawl, start, query }
