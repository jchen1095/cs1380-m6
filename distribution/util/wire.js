const routes = require('../local/routes');
const { send } = require('../local/comm');
const node = require('../local/node');
const log = require('../util/log');
const crypto = require('crypto');
const { serialize, deserialize } = require('v8');

// toLocal = {};
toRemote = {};

// function createRPC(func) {
//   // Write some code...
//   // call send() with a callback that will return the stub that we must call
  
//   // remote node info for call info

//   uid = crypto.createHash('sha256').update(func.toString()).digest('hex');
//   // add function to routes
//   routes.put({func: func}, uid, () => {});

//   return eval(((...args) => {
//     const callback = args.pop();
      
//     const remote = {node: {"ip":"__NODE_IP__","port":'__NODE_PORT__'}, service: '__UID__', method: 'func'};

      
//     distribution.local.comm.send(args, remote, (e, v) => {
//       console.log('we made it')
//       if (e) {
//         callback(e, null);
//         return;
//       } 
      
//       callback(null, v);
//       return;
//   }); 
// }).toString().replace('__NODE_IP__',global.moreStatus.ip).replace('__NODE_PORT__',global.moreStatus.port)
// .replace('__UID__', uid));
  
//   return b;
// }

let createRPC = require('@brown-ds/distribution/distribution/util/wire').createRPC;


  
  // send(message, remote, (e, f) => { // send to remote node 
  //     // return eval(v)(...args);
  //   if (e) {
  //     return serialize(e);
  //   }
  //     // call f from remote node
  //   return f(...args, (e, v) => { 
  //       // serialize the return value and send it back to the node issuing the call to g
  //     if (e) {
  //       return serialize(e);
  //     }
  //       return serialize(v);
  //     });
  // });

  // serialize arguments and send them to the node where f resides,
      // this will happen with send()

    // call f on that node, passing the deserialized arguments to f upon call,
      // this will happen with eval(v)(...args)

    // serialize the return value and send it back to the node issuing the call to g, and
      // second callback through the Async function?
    
    // pass the results to g's caller.
      // return eval(v)(...args);


  
  // the function we return is what the other node will call when they want to run that service


/*
  The toAsync function transforms a synchronous function that returns a value into an asynchronous one,
  which accepts a callback as its final argument and passes the value to the callback.
*/
// function toAsync(func) {
//   log(`Converting function to async: ${func.name}: ${func.toString().replace(/\n/g, '|')}`);

//   // It's the caller's responsibility to provide a callback
//   const asyncFunc = (...args) => {
//     const callback = args.pop();
//     try {
//       const result = func(...args);
//       callback(null, result);
//     } catch (error) {
//       callback(error);
//     }
//   };

//   /* Overwrite toString to return the original function's code.
//    Otherwise, all functions passed through toAsync would have the same id. */
//   asyncFunc.toString = () => func.toString();
//   return asyncFunc;
// }

toAsync = require('@brown-ds/distribution/distribution/util/wire').toAsync

module.exports = {
  createRPC: createRPC,
  toAsync: toAsync,
};
