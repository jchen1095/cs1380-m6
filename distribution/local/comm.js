/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

const { link } = require("fs");
const http = require('http');
const { serialize, deserialize } = require('../util/serialization');
const { log } = require("console");
const { equal } = require("assert");

/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
    // console.log(remote);
    let gid = `${remote.gid || 'local'}`;
    const path = `/${gid}/${remote.service}/${remote.method}`;
    // console.log(path)
    const options = {
        hostname: remote.node.ip,
        port: remote.node.port,
        path: path,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(serialize(message)),
        },
    }
    // throw new Error('stack trace')
    let req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            // console.log('response', data)

            const obj = deserialize(data);
            // console.log(obj)
            const err = obj[0];
            // console.log(err)
            const val = obj[1];
            if (typeof callback == 'function') {
                callback(err, val);
            }
            // if (res.statusCode !== 200) {
            //     // console.log("bad times for the gang");
                
            //     if (callback) {
            //         callback(new Error("Error:", res.statusCode), null);
            //     }
            // } else {
                
            //     // console.log(`err: ${err}\nval: ${val}`)
            //     if (typeof callback == 'function') {
            //         callback(err, val);
            //     }
            // }
        });
        res.on('error', (error) => {
            if (callback) {
                callback(error, null);
            }
        });
    });
    req.on('error', (error) => {
        if (callback) {
            callback(error, null);
        }
    });
    req.write(serialize(message), () => {req.end();});
    
    // return
}

module.exports = {send};
