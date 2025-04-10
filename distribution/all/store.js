const { getID, getNID } = require("../util/id");
const { id } = require("../util/util");

function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed store service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      _retrieveNode(context, configuration, (e, v) => {
        if (e) {
          callback(e);
          return;
        }

        global.distribution.local.comm.send([{ gid: context.gid, key: configuration }], { node: v, service: "store", method: "get" }, (e, v) => {
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

        global.distribution.local.comm.send([state, { gid: context.gid, key: key }], { node: v, service: "store", method: "put" }, (e, v) => {
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

        global.distribution.local.comm.send([{ gid: context.gid, key: configuration }], { node: v, service: "store", method: "del" }, (e, v) => {
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

    getNode: (configuration, callback) => _retrieveNode(context, configuration, callback)
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

module.exports = store;
