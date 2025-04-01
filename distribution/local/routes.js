/** @typedef {import("../types").Callback} Callback */

// const routes = {}
const RoutesMap = new Map();

/**
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
    try {
        if (typeof configuration == 'string') {
            // console.log('made to string')
            if (configuration in RoutesMap) {
                // console.log('local')
                if (!RoutesMap[configuration]) {
                    console.log('config undefined')
                    callback(new Error('Configuration is undefined'), null);
                    return;
                }
                // console.log('found')
                // console.log(RoutesMap[configuration])
                const r = RoutesMap[configuration];
                // console.log('found')
                if(callback && typeof callback == 'function') {
                    // console.log('passed')
                    callback(null, r);
                    return;
                }
                // callback && typeof callback == 'function' && callback(null, r);
                // console.log('hi')
                return;
            }
            // console.log('trying rpc')
            const rpc = global.toLocal[configuration];
            if (rpc) {
                callback(null, { call: rpc });
                return;
            } else {
                callback(new Error(`Service ${configuration} not found!`));
                return;
            }
        } else if (typeof configuration == 'object') {
            if (configuration.service in global.distribution[configuration.gid]) {
                if (global.distribution[configuration.gid] === undefined) {
                    callback(new Error('Configuration is undefined'), null);
                    return;
                }
                callback(null, global.distribution[configuration.gid][configuration.service]);
                return;
            } else {
                const rpc = global.toLocal[configuration.serviceName];
                if (rpc) {
                    callback(null, { call: rpc });
                    return;
                } else {
                    callback(new Error(`Service ${configuration.serviceName} not found!!`));
                    return;
                    }
            }
            callback(new Error("Configuration not found"), null);
            return;
        }
        callback(new Error("Type of configuration unknown:", typeof configuration));
    } catch (e) {
        console.log('NOOO')
        callback(new Error("[Routes get] Error during get: " + e));
    }
}

/**
 * @param {object} service
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function put(service, configuration, callback) {
    try {
        if (configuration != undefined | null | '') {
            RoutesMap[configuration] = service;
            if (typeof callback === 'function') {
                callback(null, configuration);
                return;
            }  
        }
        if (typeof callback === 'function') {
            callback(new Error("Configuration identifier is not defined"),null);
        }
        return
    } catch (e) {
        callback(new Error('[Routes put] Error during put: ' + e))
    }
}

/**
 * @param {string} configuration
 * @param {Callback} callback
 */
function rem(configuration, callback) {
    try {
        if (configuration in RoutesMap) {
            delete RoutesMap[configuration];
            if (typeof callback === 'function') {
                callback(null, configuration);
            return;
        }
    }
    } catch (e) {
        if (typeof callback === 'function') {
            callback(e, null);
            return;
        }
    }
    return;
};

module.exports = {get, put, rem};
