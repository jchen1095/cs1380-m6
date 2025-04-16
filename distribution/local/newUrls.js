const {getID} = require('../util/id');
const {execSync} = require('child_process');
const { id } = require('../util/util');
const path = require("path");
const newUrls = {};
const meta = {
    count: 0,
    isDone: false
}
const APP_ROOT = process.cwd();
const fs = require("fs");

// Just calls getAll from local.mem -> gets all url objects and reformats to output
newUrls.get = function(callback) {
    const urlQueue = path.join(APP_ROOT, `${id.getSID(global.nodeConfig)}-url-queue.txt`);
    try {
        const url = execSync(`head -n 1 ${urlQueue}`, { encoding: 'utf-8' }).trim();
        // NOTE: Works only on Linux.
        execSync(`sed -i '1d' ${urlQueue}`);
        callback(null, url);
    } catch (e) {
        callback(e);
    }
}

newUrls.put = function(urls, callback) {
    const urlQueue = path.join(APP_ROOT, `${id.getSID(global.nodeConfig)}-url-queue.txt`);
    const visited = path.join(APP_ROOT, `d/${id.getSID(global.nodeConfig)}-visited.txt`);
    // if (!fs.existsSync(urlQueue)) {
    //     fs.writeFileSync(urlQueue, "");
    // }
    // if (!fs.existsSync(visited)) {
    //     fs.writeFileSync(visited, "");
    // }
    // console.log("put was called! urls is:", urls);
    try {
        const urlStr = urls.join('\n');
        // console.log("put was called! urlStr is:", urlStr);
        const out = execSync(`echo "${urlStr}" | grep -vxf ${visited} | tee -a ${urlQueue} >> ${visited}`, {encoding: 'utf-8'});    
        // console.log("execSync output!:", out);
        callback(null, true)
    } catch (e) {
        callback(e);
    }
}

/**
 * Returns count of urls that have been crawled
 * @param {} callback 
 */
newUrls.status = function(callback) {
    fs = require('fs');
    let count;
    try {
        count = Number(fs.readFileSync('d/'+ id.getSID(global.nodeConfig) + '-docCount.txt', 'utf-8'));
    } catch(e) {
        count = 0;
    }
    
    callback(null, count);
}


module.exports = newUrls;



//TODO: 
// - finish flush() to grep and add to visited.txt
