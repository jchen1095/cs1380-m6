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

function changeCount(change) {
    currIters += change;  
    console.log("currIters:", currIters);
}

module.exports = { crawl, start }