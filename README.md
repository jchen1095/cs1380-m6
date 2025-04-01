# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:
  *	Regular Tests (`*.test.js`)
  *	Scenario Tests (`*.scenario.js`)
  *	Extra Credit Tests (`*.extra.test.js`)
  * Student Tests (`*.student.test.js`) - inside `test/test-student`

### Running Tests

By default, all regular tests are run. Use the options below to run different sets of tests:

1. Run all regular tests (default): `$ npm test` or `$ npm test -- -t`
2. Run scenario tests: `$ npm test -- -c` 
3. Run extra credit tests: `$ npm test -- -ec`
4. Run the `non-distribution` tests: `$ npm test -- -nd`
5. Combine options: `$ npm test -- -c -ec -nd -t`

## Usage

To import the library, be it in a JavaScript file or on the interactive console, run:

```js
let distribution = require("@brown-ds/distribution");
```

Now you have access to the full distribution library. You can start off by serializing some values. 

```js
let s = distribution.util.serialize(1); // '{"type":"number","value":"1"}'
let n = distribution.util.deserialize(s); // 1
```

You can inspect information about the current node (for example its `sid`) by running:

```js
distribution.local.status.get('sid', console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({name: 'nikos'}, 'key', console.log); // {name: 'nikos'}
distribution.local.mem.get('key', console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: '127.0.0.1', port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act 
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get('sid', console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(['sid'], {node: node, service: 'status', method: 'get'}, console.log); // 8cf1c
```

# Results and Reflections

> ...
=======
# M0: Setup & Centralized Computing

> Add your contact information below and in `package.json`.

* name: `Brian Delgado`

* email: `brian_delgado@brown.edu`

* cslogin: `bdelgad1`


## Summary

> Summarize your implementation, including the most challenging aspects; remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete M0 (`hours`), the total number of JavaScript lines you added, including tests (`jsloc`), the total number of shell lines you added, including for deployment and testing (`sloc`).


My implementation consists of `9` components addressing T1--8. The most challenging aspect was `trying to implement tf-idf` because `it required expanding the current file-based storage method to include not just a global index of terms to urls, but also another which matched terms to the number of words contained in each document. Then, similarly to regular query, the tf-idf querier needs to parse both files, retrieve the information for each url matched to a term, and calculate the tf-idf score. This took me a lot of time in thinking and implementation, so I have not had the chance to test it yet, although according to chatgpt's calculation, I may be miscalculating something, but I still have to double check`.


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation.


To characterize correctness, we developed `8` that test the following cases: did base functions and pipeline through again, but abstracted links further (into just symbols in some cases) to make sure the changes were propagated through the entire pipeline. 


*Performance*: The throughput of various subsystems is described in the `"throughput"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json.


## Wild Guess

> How many lines of code do you think it will take to build the fully distributed, scalable version of your search engine? Add that number to the `"dloc"` portion of package.json, and justify your answer below.

I wrote 3000 lines in `package.json`, largely because I know that we're building a distributed system from scratch, which will require many components interacting together. Additionally, I have built (ie. in networks), apps that have been ~2000 lines long, and that was only implementing a single protocol for the output.

# M1: Serialization / Deserialization


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M1 (`hours`) and the lines of code per task.


My implementation comprises `2` software components, totaling `100` lines of code. Key challenges included: 
* `1. Typing`: many componensts, such as `null`, `array`, `Error`, and `Date`, are all considered `objects` when using `typeof`, which was something I had to learn while testing, this led me to (1) type check for null before `object` in the sequential order of checking, and (2) use other functions, such as `Array.isArray` and `instance of`, to check for particular types.


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote `5` tests; these tests take `<time>` to execute. This includes objects with `<certain kinds of features>`.


*Performance*: The latency of various subsystems is described in the `"latency"` portion of package.json. The characteristics of my development machines are summarized in the `"dev"` portion of package.json.


# M2: Actors and Remote Procedure Calls (RPC)

## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M2 (`hours`) and the lines of code per task.


My implementation comprises `5` software components, totaling `150` lines of code. Key challenges included `routes, status, comm, node, and wire`.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote `<number>` tests; these tests take `<time>` to execute.
I did not get my tests to work. I ran out of time but will work on finishing these for the next milestone.

*Performance*: I characterized the performance of comm and RPC by sending 1000 service requests in a tight loop. Average throughput and latency is recorded in `package.json`.


## Key Feature

> How would you explain the implementation of `createRPC` to someone who has no background in computer science — i.e., with the minimum jargon possible?

We've done a lot of work to be able to store a function at a node(/computer). 
This means we can call endpoints and ask them to execute functions, as long as they don't require any special information that's stored locally for a computer.
createRPC allows us the ability to create a function (like a phone call), that someone else can make to execute a function that requires special information. By doing this, we don't have to provide that information ourselves, but the computer we are asking to do this work knows that information, and gives it the ability to change information it has stored locally in a more dynamic way.


# M3: Node Groups & Gossip Protocols


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M3 (`hours`) and the lines of code per task.


My implementation comprises `5` new software components, totaling `100` added lines of code over the previous implementation. Key challenges included `properly referring to the right reference objects for groups`.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- 1 working test so far.


*Performance* -- spawn times (all students) and gossip (lab/ec-only).



# M4: Distributed Storage


## Summary

> Summarize your implementation, including key challenges you encountered
Mem + Store: Hashing + some memory structure (memory vs. files) to store given data. The biggest challenges were tracking current hashes, and using the proper distributed source of information in the distributed form of these services.

Hash: simply applying formulas (with mod, sorting, and concatenation) to implement various functions for identifying nodes.

Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M4 (`hours`) and the lines of code per task.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- number of tests and time they take.


*Performance* -- insertion and retrieval.

# M5: Distributed Execution Engine


## Summary

> Summarize your implementation, including key challenges you encountered. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M5 (`hours`) and the lines of code per task.


My implementation comprises `2` new software components, totaling `300` added lines of code over the previous implementation. Key challenges included:
- appending data together. I decided to use a single key as the output of an execution's phase, and then at the end of mapping will find the node the specified key belongs to and append it to the file belonging in that node. The append itself would find the specified file, find the key within the object stored at that file, or create one, and append the new value to the list of previous values for that key.
- Synchronicity between phases: had to keep counts in order to make sure that a phase wouldn't continue until all the nodes and keys had finished from the previous phase.

## Key Feature

> Which extra features did you implement and how? None