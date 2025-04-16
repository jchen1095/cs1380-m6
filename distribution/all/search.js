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
            global.distribution[context.gid].comm.send([args], { service: "search", method: "query" }, (e, v) => {
                console.log(e);
                console.log(v);
                callback(e, v);
            })
        }
    }
}


module.exports = search;