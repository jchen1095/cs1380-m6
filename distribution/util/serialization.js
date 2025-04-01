
// function serialize(object) {
//   switch(object){
//     case null:
//       return "{\"type\":\"null\",\"value\":\"\"}";
//     case undefined:
//       return "{\"type\":\"undefined\",\"value\":\"\"}";
//   }
//   switch(typeof object) {
//     case 'array':
//       return serializeArray(object);
//     case 'object':
//       if (Array.isArray(object)) {
//         return serializeArray(object);
//       } else if (object instanceof Date) {
//       return `{"type":"Date","value":${JSON.stringify(object)}}`;
//       } else if (object instanceof Error) {
//         return `{"type":"Error","value":${JSON.stringify(object.message)}}`;
//       }
//       return serializeObject(object);
//     case 'function':   
//       return `{"type":"function","value":${JSON.stringify(object.toString())}}`;
//   }
//   return `{"type":${JSON.stringify(typeof object)},"value":${JSON.stringify(object.toString())}}`;
// }

// function deserialize(string) {
//   const object = JSON.parse(string);
//   return parseDeserialized(object);
// }

// function parseDeserialized(object) {
//   switch(object["type"]) {
//     case 'null':
//       return null;
//     case 'undefined':
//       return undefined;
//     case 'array':// change?
//       return deserializeArray(object.value);
//     case 'object': // change?
//       return deserializeObject(object.value);
//     case 'function':
//       return eval(`(${object.value})`);
//     case 'number':
//       return Number(object.value);
//     case 'boolean':
//       if (object.value == 'false') {
//         return false;
//       }    else if (object.value == 'true') {
//         return true;
//       }
//       throw Error('Boolean not formatted as true or false');
//     case 'string':
//       return String(object.value);
//     case 'Date':
//       return new Date(object.value);
//     case 'Error':
//       return new Error(object.value);
//   }
  
//   throw Error('Unable to deserialize')
// }


// function serializeObject(object) {
//   let components = []
//   for (const key in object) {
//     components.push(`${JSON.stringify(key)}:${JSON.stringify(serialize(object[key]))}`);
//   }
//   const finalStr = components.join(',');
//   return `{"type":"object","value":{${finalStr}}}`;
// }

// function serializeArray(array) {
//   let components = [];
//   for (const item of array) {
//     components.push(serialize(item));
//   }
//   const finalStr = components.join(',');
//   return `{"type":"array","value":[${finalStr}]}`;
// }

// function deserializeArray(array) {
//   let components = [];
//   for (const item of array) {
//     components.push(parseDeserialized(item));
//   }
//   return components;
// }

// function deserializeObject(object) {
//   let components = {};
//   for (const key in object) {
//     components[key] = parseDeserialized(JSON.parse(object[key]));
//   }
//   return components;
// }
serialize = require('@brown-ds/distribution/distribution/util/serialization').serialize;

deserialize = require('@brown-ds/distribution/distribution/util/serialization').deserialize;

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};