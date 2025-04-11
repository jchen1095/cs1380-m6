const {getID} = require('../util/id');
const {execSync} = require('child_process');
const { id } = require('../util/util');
const newUrls = {};
const meta = {
    count: 0,
    isDone: false
}

// Just calls getAll from local.mem -> gets all url objects and reformats to output
newUrls.get = function(callback) {
    // console.log("newURLS get was called!")
    global.distribution.local.mem.getAll({gid: "newUrls"}, (e,v) => {
        console.log("getAll Result is: ", v, "sid is:", id.getSID(global.nodeConfig))
        // console.log("e:", e);
        // console.log("v:", v);
        if (e) {
            callback(e);
            return;
        }
        // Maybe I don't need to reformat? What if I just return the output and we can iterate
        if (typeof v == 'object')  {
            console.log("typeof v is object...!");
            let out = [];
            for (const key of Object.keys(v)) {
                console.log("key is:", key);
                out.push(v[key])
                // try {
                // } catch (e) {
                //     console.log("error while appending!", e);
                // }
            }
            console.log("out is:", out);
            callback(null, out);
        }
    });
}

newUrls.put = function(urls, callback) {
    // assumption -> each url is {hash: url}
    // console.log("START NEWURLS PUT!");
    let count = 0;
    // console.log("URLS:", urls);
    if(Array.isArray(urls)) {
        for (const url of urls) {
            // console.log("START ITERATION");
            global.distribution.local.mem.put(url, {gid: "newUrls", key: Object.keys(url)[0] }, (e,v) => {
                if (e) {
                    callback(e);
                    return;
                }
                // console.log("mem v:", v);
                count++;
                // console.log("INCREMENT COUNT!");
                if (count >= urls.length) {
                    callback(null, count);
                }
            })
        }
    } else if (typeof urls == 'object') {
        // console.log("HI??")
        global.distribution.local.mem.put(urls, {gid: "newUrls", key: Object.keys(urls)[0] }, (e,v) => {
            // console.log("local mem put e:", e);
            // console.log("local mem put v:", v);
            if (e) {
                callback(e);
                return;
            }
            callback(null, null);       
        });
    }
}

newUrls.clear = function(callback) {
    global.distribution.local.mem.getAll({gid: "newUrls"}, (e,newUrls) => {
        // add previous urls to visited.txt
        const urls = Object.values(newUrls).join('\n');
        execSync(`echo "${urls}" >> d/visited.txt`, {encoding: 'utf-8'});

        // delete all urls to clear local mapping
        global.distribution.local.mem.del({gid: "newUrls", key: null}, (e,v) => {
            if (e) {
                callback(e);
                return;
            }
            callback(null, null);
        });
    })
    
}

newUrls.flush = function(callback) {
    // check visited.txt (grep) -> if not in visited.txt -> add to newUrls.txt
    global.distribution.local.mem.getAll({gid: "newUrls"}, (e,u) => {
        const urlArr = Object.values(u);
        const urlStr = urlArr.join('\n');
        // get all the non-visited urls
        const newUrls = execSync(`echo "${urlStr}" | grep -vxf d/visited.txt`, {encoding: 'utf-8'});    
        // add new Urls to local.mem
        const newUrlsArr = newUrls.split('\n').map(url => ({[getID(url)]: url}))
        if (newUrlsArr.length == 0) {
            meta.isDone = true;
        }
        newUrlsArr.forEach((url) => {
            local.mem.put(url, {gid: "newUrls", key: Object.keys(url)[0]}, (e,v) => {
                if(e) {
                    callback(e);
                    return;
                }
                meta.count++;
            });
        });
        callback(null, null);
    });
}


/**
 * Returns 1) count of urls that have been crawled, and 2) if crawling is done
 * @param {} callback 
 */
newUrls.status = function(callback) {
    callback(null, {count: meta.count, isDone: meta.isDone});
}


module.exports = newUrls;



//TODO: 
// - finish flush() to grep and add to visited.txt
