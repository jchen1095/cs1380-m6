function serialize(object) {
  // Case 1: Number
  if (typeof object === "number") {
      return JSON.stringify({
          type: "number",
          value: object.toString()
      })
  }
  // Case 2: String
  if (typeof object === "string") {
      return JSON.stringify({
          type: "string",
          value: object.toString()
      })
  }
  // Case 3: Boolean
  if (typeof object === "boolean") {
      return JSON.stringify({
          type: "boolean",
          value: object.toString()
      })
  }
  // Case 4: null
  if (object === null) {
      return JSON.stringify({
          type: "null",
          value: ""
      })
  }
  // Case 5: undefined
  if (object === undefined) {
      return JSON.stringify({
          type: "undefined",
          value: ""
      })
  }
  // Case 6: Functions
  if (typeof object === "function") {
      return JSON.stringify({
          type: "function",
          value: object.toString()
      })
  }
  // Case 7: Array
  if (Array.isArray(object)) {
      const arr = [];
      for (const el of object) {
          arr.push(serialize(el));
      }
      return JSON.stringify({
          type: "array",
          value: arr
      })
  }
  // Case 8: Error
  if (object instanceof Error) {
      return JSON.stringify({
          type: "error",
          value: object.message
      })
  }
  // Case 9: Date
  if (object instanceof Date) {
      return JSON.stringify({
          type: "date",
          value: object.toISOString()
      })
  }
  // Case 10: Object
  if (typeof object === "object") {
      const obj = {};
      for (const key of Object.keys(object)) {
          obj[key] = serialize(object[key])
      }
      return JSON.stringify({
          type: "object",
          value: obj
      })
  }
}

function deserialize(string) {
  // Use JSON.parse to parse the input JSON file
  // TODO - check that this returns a syntax error in case the format is invalid
  const inputJson = JSON.parse(string);

  // Check that input JSON has a type and a value. Otherwise, throw syntax error.
  if (!inputJson.hasOwnProperty('type')) {
      throw SyntaxError("Top-level or nested object has no type property")
  }
  if (!inputJson.hasOwnProperty('value')) {
      throw SyntaxError("Top-level or nested object has no value property")
  }

  const type = inputJson.type;
  const value = inputJson.value;
  switch (type) {
      case "number":
          return parseInt(value);
      case "string":
          return value;
      case "boolean":
          return value === "true" ? true : false;
      case "null":
          return null;
      case "undefined":
          return undefined;
      case "function":
          return eval('(' + value + ')');
      case "object":
          const output = {}
          for (const key of Object.keys(value)) {
              output[key] = deserialize(value[key])
          }
          return output
      case "array": {
        // console.log("value in array branch of deserialize is:", value);
        return value.map((e) =>  deserialize(e));
      }
      case "error": {
          return new Error(value);
      }
      case "date":
          return new Date(value);
      default:
          throw SyntaxError("Object has unsupported type")
  }
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize
};
