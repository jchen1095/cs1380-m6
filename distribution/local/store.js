/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

const { getID } = require("../util/id");
// const {writeFile, readFile, unlink, readFileSync} = require('fs');
const fs = require('fs');
const path = require('path');
const {serialize, deserialize} = require('../util/serialization.js');
const APPENDAGE_IDENTIFIER = 'APPENDING_OBJECT_STRUCTURE_OBJECT_LIST';

function put(state, configuration, callback) {
  const gid = configuration ? configuration.gid || 'all' : 'all';
  let key = configuration? ((typeof configuration == 'string') ? configuration || null: configuration.key || null) : null
  if (!key) {
      key = getID(state)
  }
  const gidPath = path.join('.', 'store', gid);
  if (!fs.existsSync(gidPath)) {
    fs.mkdirSync(gidPath, { recursive: true });
  }
  if (configuration && configuration.service_id) {
    gidPath = path.join(gidPath, configuration.service_id);
  }
  const nodePath = path.join(gidPath, global.distribution.util.id.getSID(global.nodeConfig));
  const filepath = path.join(nodePath, key);
  
  if (!fs.existsSync(gidPath)) {
    fs.mkdirSync(gidPath, { recursive: true });
  }
  if (!fs.existsSync(nodePath)) {
    fs.mkdirSync(nodePath, { recursive: true });
  }

  // const files = fs.readdirSync(nodePath);

  // const filepath = `./store/${global.distribution.util.id.getSID(global.nodeConfig).toString()}/${gid}${key}`;
  if(!key) {
    if (callback) {
      callback(new Error("No key or state given"));
    }
  }
  fs.writeFile(filepath, serialize(state), 'utf-8', (err) => {
    if (err) {
      console.log(err)
      if (callback) {
        callback(err, null);
        return
      }
    }
      callback && callback(null, state);
  });
}

function get(configuration, callback) {
  const key = configuration ? configuration.key || ((typeof configuration == 'string') ? configuration: null ): configuration;
  const gid = configuration?configuration.gid || 'all': 'all';
  // const filepath = `./store/${global.distribution.util.id.getSID(global.nodeConfig).toString()}/${gid}${key}`;
  const gidPath = path.join('.', 'store', gid);
  if (configuration && configuration.service_id) {
    gidPath = path.join(gidPath, configuration.service_id);
  }
  const nodePath = path.join(gidPath, global.distribution.util.id.getSID(global.nodeConfig));
  

  if (key) {
    const filepath = path.join(nodePath, key);
    fs.readFile(filepath, 'utf-8', (err, data) => {
      if (err) {
        callback && callback(new Error('File Failed to read: ' + filepath), null);
        return
      }
      try {
        const ret = deserialize(data);
        if (ret) {
          if (callback) {
            callback(null, ret);
            return
          }
        } else {
          if (callback) {
            callback(new Error("No data found"), null);
          }
        }
      } catch (e) {
        callback && callback(new Error('[Local.Store.Get] Error during execution: ' + e.message));
      }
      
    });
  } else { // no key, return all keys
    // const dirPath = path.join('.', 'store', global.distribution.util.id.getSID(global.nodeConfig));

    const files = fs.readdirSync(nodePath); // return all files
    let out = {};
    let c = 0;
    
    for (f in files) {
      fs.readFile(path.join(nodePath, f), (e, v) => {
        if (e) {
          callback && callback(e);
          return;
        }

        out[f] = deserialize(v);
        c++;

        if (c >= files.length) {
          callback && callback(null, out);
        }
      })
    }
      callback && callback(new Error("Filepath not provided"), null);
  }
  
}

function del(configuration, callback) {
  const key = configuration ? configuration.key || configuration : configuration;
  const gid = configuration ? configuration.gid || 'all' : 'all';
  // const filepath = `./store/${global.distribution.util.id.getSID(global.nodeConfig).toString()}/${gid}${key}`;
  const gidPath = path.join('.', 'store', gid);
  if (configuration && configuration.service_id) {
    gidPath = path.join(gidPath, configuration.service_id);
  }
  const nodePath = path.join(gidPath, global.distribution.util.id.getSID(global.nodeConfig));
  const filepath = path.join(nodePath, key);

  if (key) {
    fs.readFile(filepath, 'utf-8', (err, data) => {
      if (err) {
          callback && callback(new Error('Failed to read file:', filepath), null);
          return
      }
      const ret = deserialize(data);
      fs.unlink(filepath, (err) => {
        if (err) {
            callback && callback(err, null);
            return
        }
          callback && callback(null, ret);
          return
      });
    });
  } else {
      callback && callback(new Error("Filepath not provided"), null);
  }
}

// assumption: key is mr execution id + tag, then object contained is object of all keys and values in the worker, and assumption that all values are contained in arrays
function append(state, configuration, objKey, callback) {
  const key = configuration.key || configuration;
  const gid = configuration?configuration.gid || 'all': 'all';

  const gidPath = path.join('.', 'store', gid);
  const nodePath = path.join(gidPath, global.distribution.util.id.getSID(global.nodeConfig));
  const filepath = path.join(nodePath, key);
  if (!fs.existsSync(gidPath)) {
    fs.mkdirSync(gidPath, { recursive: true });
  }
  if (!fs.existsSync(nodePath)) {
    fs.mkdirSync(nodePath, { recursive: true });
  }

  var curr;
  try {
    curr = deserialize(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    curr = {};
  }
  
  try {  
    var val;
    if (curr.hasOwnProperty(objKey)) {
      val = curr[objKey];
    } else {
      val = [];
    }
    // val = curr[objKey] || [];
    val.push(state);
    curr[objKey] = val;
    fs.writeFileSync(filepath, serialize(curr), 'utf-8');
    callback(null,curr);
  } catch (e) {
    callback(new Error('[Local.Store.Append] Error during execution: ' + e.message + " curr = " + val, null));
  }

  // if (typeof state != 'object') {
  //   callback(new Error('state needs to be object'));
  //   return;
  // }
  // try {
  //   fs.readFileSync(filepath, 'utf-8');
  //   // data exists --> check and unify what we're looking at.
  //     const data = deserialize(v);
  //     for (key in state) {
  //       if (key in Object.keys(data)) { // if both share a key
  //         const curr_val = data[key];
  //         if (typeof curr_val == 'object' && APPENDAGE_IDENTIFIER in Object.keys(curr_val)) {
  //           // value is already our structured object --> simply append incoming value to list
  //           data[key][APPENDAGE_IDENTIFIER] += [[state[key]]];
  //         } else {
  //           // value in data but it is not an object with identifier --> single value, so we can wrap it in our structure
  //           const temp = data[key];
  //           data[key] = {};
  //           data[key][APPENDAGE_IDENTIFIER] = [[temp[APPENDAGE_IDENTIFIER]], [state[key]]];
  //         }
  //       } else {
  //         // current key is not already in the data --> create structure for unity of format and add to object
  //         new_val = {};
  //         new_val[APPENDAGE_IDENTIFIER] = [[state[key]]];
  //       }
  //     }
  //     put(data, configuration, (e,v) => {
  //       if(e) {
  //         callback && callback(e);
  //         return;
  //       }
  //       callback(null, v);
  //     });  
  // } catch (err) {
  //   // file doesnt exist (implicit assumption)
  //     let new_data = {};
  //     for (const key in state) {
  //       new_data[key] = {};
  //       new_data[key][APPENDAGE_IDENTIFIER] = [[state[key]]];
  //     }
  //     put(new_data, configuration, (e,v) => {
  //       if(e) {
  //         callback && callback(e);
  //         return;
  //       }
  //       callback && callback(null, v);
  //     });
  //   return;
  //   } 
}

module.exports = {put, get, del, append};
