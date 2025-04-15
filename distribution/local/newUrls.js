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

// Just calls getAll from local.mem -> gets all url objects and reformats to output
newUrls.get = function(callback) {
    const urlQueue = path.join(path.join(APP_ROOT, "non-distribution"), "url-queue.txt");
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
    const urlQueue = path.join(path.join(APP_ROOT, "non-distribution"), "url-queue.txt");
    const visited = path.join(path.join(APP_ROOT, "non-distribution"), "d/visited.txt");
    try {
        const urlStr = urls.join('\n');
        const newUrls = execSync(`echo "${urlStr}" | grep -vxf ${visited} | tee -a ${urlQueue} >> ${visited}`, {encoding: 'utf-8'});    
        callback(null, newUrls)
    } catch (e) {
        callback(e);
    }
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
