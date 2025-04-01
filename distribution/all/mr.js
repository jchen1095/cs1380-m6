/** @typedef {import("../types").Callback} Callback */

const { NotifyOps } = require("../util/enum");
const fs = require("fs");
const path = require("path");

/**
 * Map functions used for mapreduce
 * @callback Mapper
 * @param {any} key
 * @param {any} value
 * @returns {object[]}
 */

/**
 * Reduce functions used for mapreduce
 * @callback Reducer
 * @param {any} key
 * @param {Array} value
 * @returns {object}
 */

/**
 * @typedef {Object} MRConfig
 * @property {Mapper} map
 * @property {Reducer} reduce
 * @property {string[]} keys
 */


/*
  Note: The only method explicitly exposed in the `mr` service is `exec`.
  Other methods, such as `map`, `shuffle`, and `reduce`, should be dynamically
  installed on the remote nodes and not necessarily exposed to the user.
*/

function mr(config) {
  const context = {
    gid: config.gid || 'all',
  };

  /**
   * @param {MRConfig} configuration
   * @param {Callback} cb
   * @return {void}
   */
  function exec(configuration, cb) {
    const APP_ROOT = process.cwd();
    const storeFolder = path.join(APP_ROOT, "store");
    if (!fs.existsSync(storeFolder)) {
      fs.mkdirSync(storeFolder);
    }

    global.distribution.local.groups.get(context.gid, (e, groupInfo) => {
      // Step 0: Generate random length=10 ID
      const instanceId = "mr-" + Math.random().toString(36).slice(2, 2 + 10);

      // Step 1: Use local `mr` service to tell ourselves we're the orchestrator
      global.distribution.local.mr.setup({ instanceId: instanceId, isOrchestrator: true, gid: context.gid, group: groupInfo }, (e, v) => {
        global.distribution[context.gid].comm.send([{ instanceId: instanceId, isOrchestrator: false, gid: context.gid, group: groupInfo }], { service: "mr", method: "setup" }, (e, v) => {
          global.distribution[context.gid].comm.send([{ operation: NotifyOps.REGISTER_FUNCTIONS, args: [{ map: configuration.map, reduce: configuration.reduce }] }], { service: instanceId, method: "notify" }, (e, v) => {
            global.distribution[context.gid].comm.send([{ operation: NotifyOps.COMMAND_MAP, args: [configuration.keys] }], { service: instanceId, method: "notify" }, (e, v) => { 
              global.distribution[context.gid].comm.send([{ operation: NotifyOps.COMMAND_SHUFFLE, args: [] }], { service: instanceId, method: "notify" }, (e, v) => {
                global.distribution[context.gid].comm.send([{ operation: NotifyOps.COMMAND_REDUCE, args: [] }], { service: instanceId, method: "notify" }, (e, v) => {
                  global.distribution[context.gid].comm.send([{ instanceId: instanceId }], { service: "mr", method: "teardown" }, (e, _) => {
                    global.distribution.local.mr.teardown(instanceId, (e, _) => {
                      cb(null, Object.values(v).flat());
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  }

  return { exec };
};

module.exports = mr;
