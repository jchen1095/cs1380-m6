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
            const path = require('path');
            const p = path.join(__dirname, '..','..','non-distribution','c');
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
                console.log(p);
                const command = `echo "${args}" | ${p}/process.sh | node ${p}/stem.js | ${p}/combine.sh`; //| node ${path}/stem.js | ${path}/combine.sh
                ///usr/src/app/Desktop/distributed_systems/cs1380-m6/non-distribution/c/process.sh
                    // 'echo "' + args + '"'
                    // + ' | ./c/process.sh'
                    // + ' | node ./c/stem.js'
                    // + ' | ./c/combine.sh';
                let processedQuery;
                try {
                    console.log("command", command)
                    processedQuery = spawnSync('bash', ['-c', command], { //'echo "gutenberg"| ./c/process.sh | node ./c/stem.js | ./c/combine.js'
                        encoding: 'utf-8'
                    }).stdout;
                    console.log("processed query", processedQuery)
                    console.log("hello")
                    if (processedQuery=='') {
                        console.log("hello")
                        console.log("processed query is empty");
                        callback(null, []);
                        return;
                    }
                    console.log("P", processedQuery)

                    // console.log("processed query:", processedQuery);
                } catch (e) {
                    console.log("the error!: ", e.message);
                    callback(new Error("[QUERY] Error in calculating n-grams: ", e.message));
                    return;
                }
                global.distribution[context.gid].comm.send([processedQuery.trim()], { service: "query", method: "process" }, (e, results) => {
                    console.log("back from local query!")
                    console.log('hellow', e);
                    console.log('helloddd',results);
                    // v.foreach(n => console.log(n));
                    const finalQueryUrls = {};
                    Object.entries(results).forEach(([nodeId, entry]) => {
                        Object.entries(entry).forEach(([ngram, docs]) => {
                            if (!docs || docs.length === 0) {
                                console.log(`Skipping empty docs for ngram: "${ngram}"`);
                                return; // skip to next ngram
                            }
                            let length = ngram.split(' ').length; // count the words in the ngram
                            console.log(`N-gram: "${ngram}" (${length}-gram)`);
                            console.log("Value:", docs, docs.length);
                            
                            let idf = Math.log(totalCount/docs.length); 
                            console.log("IDF:", idf);
                            console.log("total counts", totalCount);
                            docs.forEach(obj => {
                                console.log("obj", obj)
                                let url = obj.url;
                                let freq = obj.freq;
            
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
                        return { url: url, score: score };
                    })
                    resultArray = resultArray.sort((a,b) => {b.score - a.score});
                    
                    console.log("Final weighted URLs:", resultArray);
                    callback(null, resultArray);
                    // callback(e, results);
                })
            })
            
        });
    }
}
}


module.exports = search;