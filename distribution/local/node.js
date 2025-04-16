const http2 = require('http2');
const url = require('url');
const log = require('../util/log');

const { serialize, deserialize } = require('../util/serialization');
const routes = require('./routes');
const { parserConfiguration } = require('yargs');
// const { status } = require('./status');

/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/

const start = function (callback) {
  const server = http2.createServer();

  server.on('stream', (stream, headers) => {
    // Disable timeout for this stream
    stream.setTimeout(0);
    const method = headers[':method'];
    const pathName = headers[':path'];

    if (method !== 'PUT') {
      stream.respond({ ':status': 405 });
      stream.end(serialize([new Error('Only PUT is supported'), null]));
      return;
    }

    const splitPath = pathName.split('/').filter((s) => s !== '');
    const gid = splitPath[0];
    const service = splitPath[1];
    const methodName = splitPath[2];

    let message = '';
    stream.setEncoding('utf8');

    stream.on('data', (chunk) => {
      message += chunk;
    });

    stream.on('end', () => {
      const args = deserialize(message);
      const config = gid === 'local' ? service : { gid: gid, service: service };

      routes.get(config, (error, value) => {
        if (error) {
          stream.respond({ ':status': 400 });
          stream.end(serialize([error, value]));
          return;
        }

        if (value[methodName]) {
          try {
            value[methodName](...args, (e, v) => {
              stream.respond({ ':status': 200 });
              stream.end(serialize([e, v]));
            });
          } catch (e) {
            stream.respond({ ':status': 500 });
            stream.end(serialize([e, null]));
          }
        } else {
          stream.respond({ ':status': 404 });
          stream.end(serialize([new Error('Method not found; path: ' + pathName), null]));
        }
      });
    });

    stream.on('error', (error) => {
      stream.respond({ ':status': 500 });
      stream.end(serialize([error, null]));
    });
  });

  server.on('session', (session) => {
    // 0 timeout
    session.socket.setTimeout(0); 
  });

  server.listen(global.nodeConfig.port, global.nodeConfig.ip, () => {
    log(`HTTP/2 server running at http://${global.nodeConfig.ip}:${global.nodeConfig.port}/`);
    global.distribution.node.server = server;
    callback(server);
  });

  server.on('error', (error) => {
    server.close();
    log(`Server error: ${error}`);
    throw error;
  });
};

module.exports = {
  start: start,
};
