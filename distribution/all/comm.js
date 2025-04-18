/** @typedef {import("../types").Callback} Callback */

const { id } = require("../util/util.js");


/**
 * NOTE: This Target is slightly different from local.all.Target
 * @typdef {Object} Target
 * @property {string} service
 * @property {string} method
 */

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {
    // console.log("configuration",configuration);
    // console.log("message",message);
    // console.log(context.gid)
    require("../local/groups.js").get(context.gid, (e, nodes) => {
      // console.log("nodes", nodes);
      if (e) {
        callback(e);
      }

      const lim = Object.keys(nodes).length;
      let counter = 0;
      let nodeToError = {};
      let nodeToResponse = {};

      // console.log("nodes:", nodes);
      for (const sillygoose in nodes) {
        // console.log("node to send to:", id.getSID(nodes[sillygoose]))
        // console.log("message to be sent:", message);
        require("../local/comm.js").send(message, {node: nodes[sillygoose], service: configuration.service, method: configuration.method}, (e,v) => {
          // console.log("e",e);
          // console.log("v",v);
          counter++;
          // console.log(counter)
          if(e) {
            nodeToError[sillygoose] = e;
          }
          if (v) {
            nodeToResponse[sillygoose] = v;
          }
          if (counter >= lim) {
            // console.log(nodeToError)
            callback(nodeToError, 
              nodeToResponse);
          }
        });
      }
    });
  }
  return {send};
};

module.exports = comm;
