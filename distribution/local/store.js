/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

const { getID, getNID } = require("../util/id");
const fs = require("fs")
const path = require("path");
const { serialize, deserialize } = require("../util/serialization");
const { id } = require("../util/util");
const APP_ROOT = process.cwd();

function put(state, configuration, callback) {
  // test if configuration is null, in which case use sha256
  let key;
  let gid = "local";
  if (configuration === null) {
    key = getID(state);
  } else if (typeof configuration === "object") {
    if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
      callback(new Error("Configuration is an object but is missing key or gid field"))
      return;
    }
    key = configuration.key;
    gid = configuration.gid;
  } else if (typeof configuration === "string") {
    key = _alphaNumericizeKey(configuration);
  } else {
    callback(new Error("Unknown format for configuration object"))
    return;
  }

  // make node folder in store/ if it doesn't exist
  const gidStoreFolder = _makeGIDStoreFolder(gid)

  // make a file with the alphanumeric key as the name
  const filePath = path.join(gidStoreFolder, key);
  try {
    // console.log("WRITE SYNC DATA IN STORE!", state)
    // console.log("FILEPATH: ", filePath);
    fs.writeFileSync(filePath, serialize(state));
    // console.log("wrote the file!")
    callback(null, state);
  } catch (err) {
    callback(err);
  }
}

function append(state, configuration, callback) {
  get(configuration, (e, v) => {
    if (e) {
      // Assume that the error says it doesn't exist
      put([state], configuration, callback)
      return;
    }

    // Assumes, if a list exists, that the outer list is appendable
    let newValue;
    if (Array.isArray(v)) {
      newValue = [...v];
      newValue.push(state);
    } else {
      newValue = [v, state];
    }

    // Uses put to put the new value
    put(newValue, configuration, callback);
  })
}

function batchAppend(state, configuration, callback) {
  // Assumes state is an array
  get(configuration, (e, v) => {
    if (e) {
      // Assume that the error says it doesn't exist
      if (Array.isArray(state)) {
        put(state, configuration, callback)
      } else {
        put([state], configuration, callback)
      }
      return;
    }

    // Assumes, if a list exists, that the outer list is appendable
    let newValue;
    if (Array.isArray(v)) {
      if (Array.isArray(state)) {
        newValue = [...v, ...state];
      } else {
        newValue = [...v, state]
      }
    } else {
      let out = [];
      if (v) {
        out = [v];
      }
      if (Array.isArray(state)) {
        out = [...out, ...state];
      } else {
        out = [...out, state];
      }
      newValue = out;
    }

    // Uses put to put the new value
    put(newValue, configuration, callback);
  })
}

function batchDelete(configuration, callback) {
  if (!Object.hasOwn(configuration, "gid")) {
    callback(new Error("Configuration is an object but is missing key or gid field"))
    return;
  }

  const gid = configuration.gid;

  // give all files in a given directory (for the provided gid in the config object)
  const gidStoreFolder = _getGIDStoreFolder(gid);
  try {
    fs.rmSync(gidStoreFolder, { recursive: true });
    callback(null, true);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // In the case where the folder wasn't found, return the error.
      // In the specific MapReduce case where this is used, we handle this quietly.
      callback(err, null);
      return;
    }
    callback(err, null);
  }

}

// expect state = array of {k,v}
function appendForBatch(state, configuration, callback) {
  if (Array.isArray(state)) {
    const gid = configuration.gid;
    let count = 0;
    for (const o of state) {
      if (typeof o == 'object') {
        const key = Object.keys(o)[0];
        const value = Object.values(o)[0];
        append(value, {gid: gid, key: key}, (e,v) => {
          if (e) {
            callback(new Error("[Store.AppendForBatch] E: " + e.message));
            return;
          }
          count++;
          if (count >= state.length) {
            callback(null, count);
          }
        });
      } 
    }
  } else {
    callback(new Error("[Store.AppendForBatch] State is not an array"));
  }
}

function get(configuration, callback) {
  let key;
  let gid = "local";
  if (typeof configuration === "object") {
    if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
      callback(new Error("Configuration is an object but is missing key or gid field"))
      return;
    }
    key = configuration.key;
    gid = configuration.gid;
  } else if (typeof configuration === "string") {
    key = _alphaNumericizeKey(configuration);
  } else {
    callback(new Error("Unknown format for configuration object"))
    return;
  }

  const gidStoreFolder = _getGIDStoreFolder(gid);
  const filePath = path.join(gidStoreFolder, key);

  if (!fs.existsSync(filePath)) {
    callback(new Error(`Key ${key} does not exist!`));
    return;
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const deserializedData = deserialize(data);
    callback(null, deserializedData);
  } catch (err) {
    callback(new Error(`Error while reading database: ${err}`));
    return;
  }
}

function del(configuration, callback) {
  let key;
  let gid = "local";
  if (typeof configuration === "object") {
    if (!Object.hasOwn(configuration, "key") || !Object.hasOwn(configuration, "gid")) {
      callback(new Error("Configuration is an object but is missing key or gid field"))
      return;
    }
    key = configuration.key;
    gid = configuration.gid;
  } else if (typeof configuration === "string") {
    key = _alphaNumericizeKey(configuration);
  } else {
    callback(new Error("Unknown format for configuration object"))
    return;
  }

  const gidStoreFolder = _getGIDStoreFolder(gid);
  const filePath = path.join(gidStoreFolder, key);

  if (!fs.existsSync(filePath)) {
    callback(new Error(`Key ${key} does not exist!`));
    return;
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const deserializedData = deserialize(data);

    // now delete the file
    fs.rmSync(filePath);
    callback(null, deserializedData)
  } catch (err) {
    if (err) {
      callback(new Error(`Error while reading database or deleting files: ${err}`));
      return;
    }
  }
}

function search(configuration, callback) {
  // Only supports searching by gid, for now.
  if (!Object.hasOwn(configuration, "gid")) {
    callback(new Error("Configuration is an object but is missing key or gid field"))
    return;
  }

  const gid = configuration.gid;

  // give all files in a given directory (for the provided gid in the config object)
  const gidStoreFolder = _getGIDStoreFolder(gid);
  try {
    const files = fs.readdirSync(gidStoreFolder);
    callback(null, files);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // In the case where the folder wasn't found, there must be no keys.
      // Return empty array
      callback(null, []);
      return;
    }
    callback(err, null);
  }
}

function clear(callback) {
  const storeFolder = path.join(APP_ROOT, "store");
  if (fs.existsSync(storeFolder)) {
    const nodeFolder = path.join(storeFolder, id.getNID(global.nodeConfig));
    if (fs.existsSync(nodeFolder)) {
      fs.rmSync(nodeFolder, { recursive: true, force: true });
    } 
    callback();
  }
}


function _makeNodeStoreFolder() {
  const storeFolder = path.join(APP_ROOT, "store");
  if (!fs.existsSync(storeFolder)) {
    fs.mkdirSync(storeFolder);
  }
  const folderPath = _getNodeStoreFolder();
  // error handle?
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  return folderPath;
}

function _getNodeStoreFolder() {
  const nid = getNID(global.nodeConfig);
  return path.join(APP_ROOT, "store", nid)
}

function _makeGIDStoreFolder(gid) {
  // first make the node store folder if it doesn't exist
  const rootPath = _makeNodeStoreFolder();

  // then proceed to get the GID specific folder
  const folderPath = path.join(rootPath, gid);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
  return folderPath
}

function _getGIDStoreFolder(gid) {
  return path.join(_getNodeStoreFolder(), gid)
}

function _alphaNumericizeKey(key) {
  return key.replace(/[^a-zA-Z0-9]/g, '')
}

module.exports = { put, get, del, append, appendForBatch, batchAppend, batchDelete, search, clear };
