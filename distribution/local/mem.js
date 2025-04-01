const getID = require('../util/id.js').getID;

const MemMapping = {};

function put(state, configuration, callback) {
    console.log('hi')
    try {
        const gid = configuration ? configuration.gid || 'all' : 'all';
        let key = configuration? ((typeof configuration == 'string') ? configuration || null: configuration.key || null) : null
        
        if (!key) {
            key = getID(state)
        }
                // key = getID(key);
        console.log('hi')
        console.log(MemMapping)
        if (!(MemMapping.hasOwnProperty(gid))) {
            MemMapping[gid] = new Map();
        }
        console.log(MemMapping)
        console.log('mapping')
        console.log(key)
        MemMapping[gid].set(key, state);   
        console.log(MemMapping)
        if (callback) {
            callback(null, state);
        }
    } catch (e) {
        if (callback) {
            callback(e, null);
        }
    }
};

function get(configuration, callback) {
    try {
        if(configuration == null) {
            MemMapping.hasOwnProperty(gid) && callback(null, MemMapping[gid]); // will return as a map 
        }
        // const key = getID(configuration.key || configuration);
        const key = configuration.key || configuration;
        // console.log(key)
        const gid = configuration ? configuration.gid || 'all': 'all';
        

        if (!(MemMapping.hasOwnProperty(gid))) {
            callback(new Error("[get] Group not found:"+ gid), null);
            return
        }

        if (!(MemMapping[gid].has(key))) {
            console.log(configuration)
            console.log(key)
            console.log(MemMapping)
            callback(new Error("[Get] Key not found: " + key), null);
            return;    
        }

        callback(null, MemMapping[gid].get(key));
        return;
    } catch (e) {
        callback (new Error("[Get] Error during execution. :/"), null);
    }
    
}

function del(configuration, callback) {
    // const key = getID(configuration.key || configuration);
    const key = configuration.key || configuration;
    const gid = configuration?configuration.gid || 'all': 'all';

    if (!(MemMapping.hasOwnProperty(gid))) {
        callback(new Error("Group not found:"+ gid), null);
        return
    }

    if (MemMapping[gid].has(key)) {
        const temp = MemMapping[gid].get(key)
        MemMapping[gid].delete(key)
        if (callback) {
            callback(null, temp);
        }
    } else {
        if (callback) {
            callback(new Error('[Del] Key not found:' + key), null);
        }
    }
};

module.exports = {put, get, del};
