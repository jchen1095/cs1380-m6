/** @typedef {import("../types.js").Node} Node */

const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
/** @typedef {!string} ID */

/**
 * @param {any} obj
 * @return {ID}
 */
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

/**
 * The NID is the SHA256 hash of the JSON representation of the node
 * @param {Node} node
 * @return {ID}
 */
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

/**
 * The SID is the first 5 characters of the NID
 * @param {Node} node
 * @return {ID}
 */
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function getMID(message) {
  const msg = {};
  msg.date = new Date().getTime();
  msg.mss = message;
  return getID(msg);
}

function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

function consistentHash(kid, nids) {
  // keep mapping from number to original id
  const numsToIds = new Map();
  numsToIds.set(idToNum(kid), kid);
  for (nid of nids) {
    numsToIds.set(idToNum(nid), nid);
  }

  // get list of values
  const nums = [...numsToIds.keys()];
  nums.sort();
  const kidIndex = nums.indexOf(idToNum(kid));
  
  // determine element right after kid
  let toPick;
  if (kidIndex === nums.length-1) {
    toPick = 0;
  } else {
    toPick = kidIndex + 1;
  }

  // return ID of node corresponding to that element
  return numsToIds.get(nums[toPick]);
}


function rendezvousHash(kid, nids) {
  const numsToIds = new Map();
  for (nid of nids) {
    numsToIds.set(idToNum(getID(kid + nid)), nid);
  }

  const nums = [...numsToIds.keys()];
  // sort in reverse order
  nums.sort((a, b) => b-a);

  return numsToIds.get(nums[0])
}

module.exports = {
  getID,
  getNID,
  getSID,
  getMID,
  naiveHash,
  consistentHash,
  rendezvousHash,
};