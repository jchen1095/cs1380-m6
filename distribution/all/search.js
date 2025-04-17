const { newUrls } = require("../local/local");
const { spawnSync } = require("child_process");

function search(config) {
    const context = {};
    context.gid = config.gid || "all";

    return {
        crawl: (configuration, callback) => {
            callback = callback || function () { };
            global.distribution[context.gid].comm.send([configuration], { service: "search", method: "crawl" }, (e, v) => {
                callback(e, v);
            })
        },

        start: (callback) => {
            callback = callback || function () { };
            // console.log("gets here!222")
            global.distribution[context.gid].comm.send([ context.gid ], { service: "search", method: "start" }, (e, v) => {
                callback(e, v);
            })
        },

        query: (args, callback) => {
            callback = callback || function () { };
            console.log('in distributed query', args);
            global.distribution[context.gid].comm.send([], {service: 'newUrls', method: 'status'}, (e,counts) => {
                if(e.length > 0) {
                    console.log('Counts check error:',e);
                    return;
                }
                console.log("counts");
                let totalCount = 0;
                console.log("counts:",counts);
                Object.values(counts).forEach(c => totalCount+=c);
                let processedQuery;
                try {
                    processedQuery = spawnSync('bash', ['-c', 'echo "amor txt"| ./c/process.sh | node ./c/stem.js | ./c/combine.js'], {
                        encoding: 'utf-8'
                    }).stdout;        
                    
                } catch (e) {
                    console.log("the error!: ", e.message);
                    callback(new Error("[QUERY] Error in calculating n-grams: ", e.message));
                    return;
                }
                global.distribution[context.gid].comm.send([processedQuery.trim()], { service: "query", method: "process" }, (e, results) => {
                    console.log("back from local query!")
                    console.log(e);
                    console.log(results);
                    v.foreach(n => console.log(n));
                    results.forEach(entry => {
                        let ngram_pls = Object.keys(entry)[0]; // key of ngram "best book"
                        let value = entry[ngram_pls];          // value object of arrays of url objs
                        let length = ngram_pls.split(' ').length;; // count the words in the ngram
                        let idf = Math.log(numDocs/value.length); 
                        value.forEach(obj => {
                            console.log("obj", obj)
                            let url = obj.url;
                            let freq = obj.freq;
                            console.log(`N-gram: "${ngram_pls}" (${length}-gram)`);
                            console.log("Value:", value);
        
                            if (!(url in finalQueryUrls)) {
        
                                // url is not in the map
                                finalQueryUrls[url] = 0;
                            }
                            //log total num docs/ num docs for the specific ngram appears 
                            finalQueryUrls[url] += length * freq * idf;
                            
                        });
                    });            
                    let resultArray = Object.entries(finalQueryUrls).map(([url, score]) => {
                        console.log("URL,", url)
                        console.log("SORCE:", score)
                        return { [url]: score };
                    });
                    
                    console.log("Final weighted URLs:", resultArray);
                    callback(null, resultArray);
                    // callback(e, results);
                })
            })
            
        }
    }
}


module.exports = search;