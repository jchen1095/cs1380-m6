const { group } = require('yargs');

const util = require('../util/id.js');
const groups = {};
const groupMapping = new Map();
groupMapping.set('all',{})
// groupMapping['all'] = {}; // TODO: Implement adding to this group based on put and add

groups.get = function(name, callback) {
    switch(name) {
        case 'all':
            if (typeof callback == 'function') {
                callback(null, groupMapping.get('all'));
            }
        default: 
            if (groupMapping.has(name)) {
                if (typeof callback == 'function') {
                    callback(null, groupMapping.get(name));
                }
            } else {
                if (typeof callback =='function') {
                    callback(new Error("Group not found"));
                }
            }
    }
};

groups.put = function(config, group, callback) {
    // console.log(config)
    // groupMapping[config.gid || config] = group;
    groupMapping.set(config.gid || config, group);
    groupMapping.set('all', Object.assign({},groupMapping.get('all'), group))
    
    global.distribution[config.gid || config] = {};
    global.distribution[config.gid || config].status = require("../all/status.js")({gid: config.gid || config});
    global.distribution[config.gid || config].gossip = require("../all/gossip.js")({gid: config.gid || config});
    global.distribution[config.gid || config].groups = require("../all/groups.js")({gid: config.gid || config});
    global.distribution[config.gid || config].mem = require("../all/mem.js")({gid: config.gid || config, hash: config.hash});
    global.distribution[config.gid || config].routes = require("../all/routes.js")({gid: config.gid || config});
    global.distribution[config.gid || config].comm = require("../all/comm.js")({gid: config.gid || config});
    global.distribution[config.gid || config].store = require("../all/store.js")({gid: config.gid || config, hash: config.hash});
    global.distribution[config.gid || config].mr = require("../all/mr.js")({gid: config.gid || config});
    if (typeof callback == 'function') {
        callback(null, group);
    }
};

groups.del = function(name, callback) {
    if(groupMapping.has(name)) {
        let group = groupMapping.get(name);
        // delete groupMapping[name];
        groupMapping.delete(name);
        if (typeof callback == 'function') {
            callback(null, group);
        }
    } else {
        if (typeof callback == 'function') {
            callback(new Error('Node not found:',name));
        }
    }
};

groups.add = function(name, node, callback) {
    if (groupMapping.has(name)) {
        groupMapping.get(name)[util.getSID(node)] = node;
        groupMapping.get('all')[util.getSID(node)] = node;
        // groupMapping[name][util.getSID(node)] = node;
        if (typeof callback == 'function') {
            callback(null, node);
        }
    } else {
        if (typeof callback == 'function') {
            callback(new Error("Group Not Found"));    
        }
    }
};

groups.rem = function(name, node, callback) {
    // console.log('Node:',node.toString());
    if (groupMapping.has(name)) {
        // if(groupMapping[name].hasOwnProperty(node)) {
        if(groupMapping.get(name).hasOwnProperty(node)) {

            let deletedNode = groupMapping.get(name)[node];
            delete groupMapping.get(name)[node];
            if (typeof callback == 'function') {
                callback(null, deletedNode);
            }
        } else {
            if (typeof callback == 'function') {
                callback(new Error('Node in group not found'))
            }
        }
    } else {
        if (typeof callback == 'function') {
            callback(new Error("Group Not Found"));
        }
    }
};

module.exports = groups;
