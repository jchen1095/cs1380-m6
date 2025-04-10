const { getID } = require("../util/id");

const memMap = new Map();

function put(state, configuration, callback) {
    let key;
    let gid = "local";
    if (configuration === null) {
        // configuration is null, use hash of the object as a key
        key = getID(state);
    } else if (typeof configuration === "object") {
        if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
            callback(new Error("Configuration is an object but is missing key or gid field"))
            return;
        }
        key = configuration.key;
        gid = configuration.gid;
    } else if (typeof configuration === "string") {
        // just use the key directly to query stuff
        key = configuration;
    } else {
        callback(new Error("Unknown format for configuration object"))
        return;
    }
    
    // store object in the map, based on origin group
    if (!memMap.has(gid)) {
        memMap.set(gid, new Map());
    }
    memMap.get(gid).set(key, state);

    // callback to return
    callback(null, memMap.get(gid).get(key));
};

function get(configuration, callback) {
    let key;
    let gid = "local";
    if (typeof configuration === "object") {
        if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
            callback(new Error("Configuration is an object but is missing key or gid field"))
            return;
        }
        key = configuration.key;
        gid = configuration.gid;
    } else if (typeof configuration === "string") {
        key = configuration;
    } else {
        callback(new Error("Unknown format for configuration object"))
        return;
    }

    if (!memMap.has(gid)) {
        callback(new Error(`Key ${key} was not found.`));
        return;
    }
    if (!memMap.get(gid).has(key)) {
        callback(new Error(`Key ${key} was not found.`));
        return;
    }

    callback(null, memMap.get(gid).get(key));
}

function del(configuration, callback) {
    let key;
    let gid = "local";
    if (typeof configuration === "object") {
        if (!Object.hasOwn(configuration, "gid")) {
            callback(new Error("Configuration is an object but is missing key or gid field"))
            return;
        }
        key = configuration.key || null;
        gid = configuration.gid;
    } else if (typeof configuration === "string") {
        key = configuration;
    } else {
        callback(new Error("Unknown format for configuration object"))
        return;
    }

    if (!memMap.has(gid)) {
        callback(new Error(`Key ${key} was not found.`));
        return;
    }

    if (key === null) {
        // case: delete all (key = null)
        memMap.delete(gid);
        memMap.set(gid, new Map());
        callback(null, null);
        return;
    }
    
    if (!memMap.get(gid).has(key)) {
        callback(new Error(`Key ${key} was not found.`));
        return;
    }

    const deleted = memMap.get(gid).get(key);
    memMap.get(gid).delete(key);
    callback(null, deleted);
};

/**
 * Helper function which returns the map of a gid as an object 
 * @param {* * configuration that contains gid spec} configuration 
 * @param {* * callback function} callback 
 * @returns 
 */
function getAll(configuration, callback) {
    let gid = "local";
    if (typeof configuration === "object") {
        if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
            callback(new Error("Configuration is an object but is missing key or gid field"))
            return;
        }
        gid = configuration.gid;
    } else {
        callback(new Error("Unknown format for configuration object"))
        return;
    }
    if (!memMap.has(gid)) {
        callback(new Error(`GID ${gid} was not found.`));
        return;
    }
    callback(null, Object.fromEntries(memMap.get(gid)));
}

module.exports = {put, get, del, getAll};
