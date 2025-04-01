/** @typedef {import("../types").Callback} Callback */
const getID = require('../util/id.js').getID;
const getNID = require('../util/id.js').getNID;
const log = require('../util/log.js');

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


const MAP = 'MAP';
const SET_MAP = 'set_map';
const GET_STATUS = 'get_status';

const STATUS_MAP_READY = 'map_ready';
const STATUS_MAP_NOT_READY = 'map_not_ready';
const STATUS_MAP_COMPLETE = 'map_complete';
const STATUS_RED_READY = 'red_ready';
const STATUS_RED_NOT_READY = 'red_not_ready';
const STATUS_RED_COMPLETE = 'red_complete';

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
    if (!configuration) {
      cb(new Error("[MR] No configuration object given."));
    }

    if (!configuration.keys) {
      cb(new Error("[MR] No keys given."));
    }
    const map_fn = configuration.map;
    
    if (!map_fn) {
      map_fn = (k,v) => {return (k,v);}
    }

    const red_fn = configuration.reduce;

    // 1. Initiate service --> need name mr-id
    const mr_id = 'mr-' + getID(Math.random());
    console.log(mr_id);

    // place orchestrator notify handler for messages from workers
    global.distribution.local.routes.put({notify: notify_me}, mr_id, (e,v) => {
      if (e) {
        cb(new Error('[ORCH: setup] Failed to put internal notify in route: ' + e.message));
        return;
      }
      console.log('orch put success')

      // place notify handler on all workers to receive commands from orchestrators
      global.distribution[context.gid].routes.put(
        {exec_worker: 
          notification_handler(
            ).notify}, 
            mr_id + '-notif', (e,v) => {
        // send 
        if(e.length) {
          cb(new Error('oops'));
          return;
        }
        let count = 0;
        for (const k in configuration.keys) {
          // console.log(configuration.keys);
          const key = configuration.keys[k]
          
          // iterate through keys, choose hash and send to individual nodes
          global.distribution[context.gid].store.get_node(key, (e,node) => {
            if(e) {
              cb && cb(e);
              return;
            }
            // console.log(node);
            
            out =[];
            // once we have the node, we can send it a ping with this key to make it map the value 
            global.distribution.local.comm.send([{cmd: MAP, map_fn:map_fn, keys:[key], node: node, id: mr_id, gid: context.gid}],
                {node: node, service: mr_id + '-notif', method: 'exec_worker'}, (e,v) => {
              out.push(v);
              console.log(key);
              console.log(v);
              console.log(e);
              // cb(null, v);
              // count += v[0].length;
              console.log(configuration.keys)
              console.log(count)
              count++;
              if(count >= configuration.keys.length) {
                console.log('done')
                // cb(null, out);
                global.distribution[context.gid].comm.send([{cmd: 'REDUCE', red_fn: red_fn, id: mr_id + '-mapped', gid: context.gid}], 
                  {service: mr_id + '-notif', method: 'exec_worker'},(e,v) => {
                  if (e) {
                    console.log(e)
                    // cb && cb(e);
                    // return;
                  }
                  console.log(v);
                  let out = []
                  for (const k in v) {
                    // if (v[k]) {
                    //   cb && cb(null, v[k])
                    // }
                    out = out.concat(v[k]);
                  }
                  cb && cb(null, out)
                })
              }
            });
          });
        }
      });
    });
  }

  return {exec};
};

// function in the worker which can get called on by the orchestrator to start particular steps.
function notification_handler() {
  function notify(config, callback) {  
    if (!config) {
      console.log('done... error local store get');
      callback && callback(new Error("[WORK call] No configuration object given."));
      return;
    }
    switch(config.cmd){
      case 'MAP':
        if(!config.map_fn) {
          callback && callback(new Error("[WORK call] no Mapping function provided."))
          return;
        }
        let out = []
        let count = 0;
        for(const key in config.keys) {
          // get original value
          global.distribution.local.store.get({gid:config.gid, key: config.keys[key]}, (e, file) => {
            if(e) {
              callback && callback(new Error("[WORK call]: "  + " Error in local store get: " + e.message));
              return;
            }
            count++;
            // map and locally store values
            out.push(config.map_fn(config.keys[key], file));
            // callback && callback(null, out[0][0][0]);
            if(count >= config.keys.length) {
              let sendCount = 0;
              // when finished, for each kv, send to corresponding node (shuffle)
              for (const k in out) {
                for (const k2 in out[k]) {
                  for (const objKey in out[k][k2]) {
                    global.distribution[config.gid].store.get_node(objKey, (e, node) => { // get corresponding node
                      if (e) {
                        callback && callback(new Error("[WORK call]: " + "Error in local store get node after mapping: " + e.message));
                        return;
                      }
                      global.distribution.local.comm.send([out[k][k2][objKey], {key: config.id + "-mapped", gid: config.gid}, objKey], {node: node, service: 'store', method: 'append'}, (e,v) => {
                        if (e) {
                          callback && callback(new Error('[WORK call]: ' + "Error in local store append: " + e.message));
                          return;
                        }
                        sendCount++;
                        if (sendCount >= out.length * out[k].length) {
                          callback && callback(null, out);
                        }
                      });
                    });
                  }
                }
              }
            }
          });  
        }
        break;
      case 'REDUCE':
        //Reduce Process:
        // Grab obj (mr-id-mapped)
        //  for all kv's 
        //  if !Array.isArray: return k,v
        //  if .length > 2: reduction process
        //  else: return k,v[0]  
        if(!config.red_fn) {
          callback && callback(new Error('[WORK call] No reducing function provided.'))
          return;
        }
        global.distribution.local.store.get({gid: config.gid, key: config.id}, (e,v) => {
          if (e) {
            callback && callback('[WORK call: Reduce]: error during local store get: ' + e.message);
            return;
          }
          if(!typeof v == 'object') {
            callback && callback(new Error('[WORK: Reduce] Retrieved object is not an object'))
            return;
          }
          let out = []
          for (const k in v) {
            if (!Array.isArray(v[k])) {
              let val = {};
              val[k] = v;
              out.push(val);
              continue;
            }
            if (v[k].length == 0) {
              let val = {};
              val[k] = v[k]
              out.push(val);
              continue;
            }
            let red = config.red_fn(k, v[k]);
            out.push(red);
          }
          callback && callback(null, out);
          return;
        });
        break;
      default:
        callback && callback(new Error('[Notif Handler] Did not recognize command type: ' + config.cmd));
    }
  }
  return {notify: notify};
}


function notify_me(mr_id, message, key) {
  console.log('notifying myself');
}

module.exports = mr;