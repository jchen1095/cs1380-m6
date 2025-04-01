const gossip = {};


// gossip.recv = function(payload, callback) {
// };
gossip.recv = require('@brown-ds/distribution/distribution/local/gossip').recv;

module.exports = gossip;
