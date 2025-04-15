const fs = require("fs");

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

        start: () => {
            fs.writeFileSync("url-queue.txt");
            setInterval(() => {
                _poll(context.gid);
            }, 2000);
        }
    }
}

let currIters = 0;
function _poll(gid) {
    global.distribution.local.newUrls.get((e, v) => {
        if (e) {
            console.log("Error while polling!");
            return;
        }
        currIters++;
        global.distribution.local.search.crawl({ gid: gid, url: v }, (e, v) => {
            // Do something to stop polling maybe?
        })
    })
}

module.exports = search;