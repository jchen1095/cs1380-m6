const log = require('../util/log');

const status = {};
const id = require('../util/id');

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
  ip: global.nodeConfig.ip,
  port: global.nodeConfig.port,
  heapTotal: 0,
  heapUsed: process.memoryUsage().heapUsed,
};

status.get = function(configuration, callback) {
  callback = callback || function() { };

  if (configuration === 'heapTotal') {
    v = process.memoryUsage().heapTotal;
    try{
      callback(null, v);
    } catch (e) {
      callback(e, null);
    }
    return;
  }
  if (configuration === 'heapUsed') {
    try {
      callback(null, process.memoryUsage().heapUsed);
    } catch (e) {
      callback(e, null);
    }
    return;
  }
  if (configuration === 'sid') {
    try {
      callback(null, global.moreStatus.sid);
    } catch (e) {
      callback(e, null);
    }
    return
  }
  if (configuration === 'nid') {
    try {
      callback(null, global.moreStatus.nid);
    } catch (e) {
      callback(e, null);
    }
    return
  }
  if (configuration === 'ip') {
    try {
      callback(null, global.moreStatus.ip);
    } catch (e) {
      callback(e, null);
    }
    return
  }
  if (configuration === 'port') {
    try {
      callback(null, global.moreStatus.port);
    } catch (e) {
      callback(e, null);
    }
    return
  }
  if (configuration === 'counts') {
    try {
      callback(null, global.moreStatus.counts);
    } catch (e) {
      callback(e, null);
    }
    return
  }

  callback(new Error('Status key not found:', configuration), null);
};


status.spawn = require('@brown-ds/distribution/distribution/local/status').spawn; 
status.stop = require('@brown-ds/distribution/distribution/local/status').stop; 


// status.spawn = function(configuration, callback) {
// };

// status.stop = function(callback) {
// };

module.exports = status;
