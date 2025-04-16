const http2 = require('http2');
const { serialize, deserialize } = require('../util/serialization');

/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
  const gid = `${remote.gid || 'local'}`;
  const path = `/${gid}/${remote.service}/${remote.method}`;
  const host = `${remote.node.ip}:${remote.node.port}`;
  const authority = `http://${host}`;

  const retryDelayMs = 3000;

  function attemptConnect() {
    let client;
    try {
      client = http2.connect(authority);
    } catch (err) {
      // unlikely to throw synchronously, but catch just in case
      retryLater(err);
      return;
    }

    let connected = false;

    client.on('connect', () => {
      connected = true;
      const req = client.request({
        ':method': 'PUT',
        ':path': path,
        'content-type': 'application/json',
      });

      let responseData = '';
      req.setEncoding('utf-8');
      req.setTimeout(0); // disable stream timeout

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        const [err, val] = deserialize(responseData);
        if (typeof callback === 'function') {
          callback(err, val);
        }
        client.close();
      });

      req.on('error', (error) => {
        if (callback) callback(error, null);
        client.close();
      });

      req.write(serialize(message));
      req.end();
    });

    client.on('error', (err) => {
      if (!connected) {
        retryLater(err);
      } else {
        // stream-level error already handled
        client.close();
      }
    });

    function retryLater(err) {
      console.log(`Connection failed (${err.code || err.message}), retrying in ${retryDelayMs / 1000}s...`);
      if (client) client.close();
      setTimeout(attemptConnect, retryDelayMs);
    }
  }

  attemptConnect();
}

module.exports = { send };
