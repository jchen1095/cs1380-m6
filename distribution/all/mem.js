const { getID, getNID } = require("../util/id");

function mem(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed mem service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      _retrieveNode(context, configuration, (e, v) => {
        if (e) {
          callback(e);
          return;
        }

        const keyObject = {gid: context.gid, key: configuration }
        global.distribution.local.comm.send([ keyObject ], { node: v, service: "mem", method: "get" }, (e, v) => {
          if (e) {
            callback(e);
            return
          }
          callback(null, v);
        })
      })
    },

    put: (state, configuration, callback) => {
      let key = configuration;
      if (configuration === null) {
        key = getID(state);
      }
      _retrieveNode(context, key, (e, v) => {
        if (e) {
          callback(e);
          return;
        }

        const keyObject = { gid: context.gid, key: key }
        global.distribution.local.comm.send([ state, keyObject ], { node: v, service: "mem", method: "put" }, (e, v) => {
          if (e) {
            callback(e);
            return
          }
          callback(null, v);
        })
      })
    },

    del: (configuration, callback) => {
      _retrieveNode(context, configuration, (e, v) => {
        if (e) {
          callback(e);
          return;
        }

        const keyObject = {gid: context.gid, key: configuration }
        global.distribution.local.comm.send([ keyObject ], { node: v, service: "mem", method: "del" }, (e, v) => {
          if (e) {
            callback(e);
            return
          }
          callback(null, v);
        })
      })
    },

    reconf: (configuration, callback) => {
    },
  };
};

function _retrieveNode(context, configuration, callback) {
  // hash the configuration using sha256 to get the kid
  const kid = getID(configuration);

  // get the list of nodes in the group from my perspective
  global.distribution.local.groups.get(context.gid, (e, nodeInfo) => {
    if (e) {
      callback(new Error(`Error while retrieving group ${context.gid}`, e));
      return;
    }

    // get list of NIDs in the group
    const allNids = Object.entries(nodeInfo).map(([_, value]) => getNID(value))
    const nodeId = context.hash(kid, allNids)
    const node = nodeInfo[nodeId.substring(0, 5)];
    callback(null, node);
  })
}

module.exports = mem;
