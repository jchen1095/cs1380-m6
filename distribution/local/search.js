function crawl(config, callback) {
    let scriptOutput;
    const { url, gid } = config;
    try {
        scriptOutput = spawnSync('bash', ['./jen-crawl.sh', url], {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024 * 64
        });
    } catch (e) {
        console.log("error:", e.message);
        return;
    }
    const urlsRaw = scriptOutput.stderr;
    const urlList = urlsRaw.split('\n');

    let urlCount = 0;
    const sidToURLList = {};
    const nsidToNode = {};

    if (urlList.length === 1 && urlList[0] === '') {
        // TODO: Determine what we want the callback to return
        callback(null, true);
        _processDocs(scriptOutput);
    } else {
        for (const rawUrl of urlList) {
            distribution[gid].store.getNode(rawUrl, (e, nodeToSend) => {
                urlCount++;
                // Add to per node batch of URLs
                const sid = distribution.util.id.getSID(nodeToSend);
                if (!Object.hasOwn(sidToURLList, sid)) {
                    sidToURLList[sid] = [];
                }

                const newUrlKey = distribution.util.id.getID(rawUrl).slice(0, 20);
                sidToURLList[sid].push({ [newUrlKey]: rawUrl })
                nsidToNode[sid] = nodeToSend;

                if (urlCount === urlList.length) {
                    let nodesReceivingURLList = 0;
                    // We've gone through all URLs. Let's send through the nextURLs service
                    for (let nsid in sidToURLList) {
                        if (nsid === distribution.util.id.getSID(global.nodeConfig)) {
                            distribution.local.newUrls.put(
                                sidToURLList[nsid],
                                (e, v) => {
                                    nodesReceivingURLList++;
                                    if (nodesReceivingURLList === Object.keys(sidToURLList).length) {
                                        callback(null, true)
                                        _processDocs(scriptOutput);
                                    }
                                }
                            )
                        } else {
                            distribution.local.comm.send(
                                [sidToURLList[nsid]],
                                { node: nsidToNode[nsid], service: "newUrls", method: "put" },
                                (e, v) => {
                                    nodesReceivingURLList++;
                                    if (nodesReceivingURLList === Object.keys(sidToURLList).length) {
                                        callback(null, true);
                                        processDocs(scriptOutput);
                                    }
                                })
                        }
                    }
                }
            })
        }
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


    result.forEach(item => {
        const ngram = item.key;
        const freq = item.value.freq;
        const url = item.value.url;
        const ngramInfo = { [ngram]: { freq: freq, url: url } }
        distribution.local.store.appendForBatch([ngramInfo], { gid: "ngrams" }, (e, v) => {
            if (e) {
                console.log("Error in append for batch: ", e);
            }
        })
    })
};

module.exports = { crawl }