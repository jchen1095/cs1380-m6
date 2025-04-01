const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    put: (config, group, callback) => {
      callback = callback || function() {};
      // console.log(config)
      // console.log(group)
      global.distribution[context.gid].comm.send([config, group], {service: 'groups', method: 'put'}, (e,v) => {
        callback(e,v);
      });
    },

    del: (name, callback) => {
      callback = callback || function() {};
      // console.log(config)
      global.distribution[context.gid].comm.send([name], {service: 'groups', method: 'del'}, (e,v) => {
        callback(e,v);
      });
    },

    get: (name, callback) => {
      global.distribution[context.gid].comm.send([name], {service: 'groups', method: 'get'}, (e,v) => {
        callback(e,v);
      });
    },

    add: (name, node, callback) => {
      global.distribution[context.gid].comm.send([name,node], {service: 'groups', method: 'add'}, (e,v) => {
        callback(e,v);
      });
    },

    rem: (name, node, callback) => {
      global.distribution[context.gid].comm.send([name, node], {service: 'groups', method: 'rem'}, (e,v) => {
        callback(e,v);
      });
    },
  };
};

module.exports = groups;
