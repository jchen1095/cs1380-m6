/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

const local = distribution.local;
const id = distribution.util.id;

global.testVal = false;

test('(1 pts) student test', (done) => {

  // const startTime = Date.now();
  // iterations = 1000;
  // jest.setTimeout(10000);
  // const node = distribution.node.config;
  // const remote = {node: node, service: 'status', method: 'get'};
  // const message = ['nid'];

  // for (let i = 0; i < iterations; i++) {
  //   local.comm.send(message, remote, (e, v) => {
  //     try {
  //       expect(e).toBeFalsy();
  //       expect(v).toBe(id.getNID(node));
  //     } catch (error) {
  //         done(error);
  //     }
  //   });
  // }
  
  // const endTime = Date.now();
  // const duration = endTime - startTime;
  // console.log(`Throughput Test: Serialized and deserialized ${iterations} objects in ${duration} ms`);
  // console.log(`Throughput Test: ${iterations*3 / (duration / 1000)} operations per second`);

  done();
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  const node = distribution.node.config;
  const remote = {node: node, service: 'status', method: 'get'};
  const message = [
    'nope',
  ];

  local.comm.send(message, remote, (e, v) => {
    try {
      done(new Error("Did not error"))
    } catch (error) {
      expect(e).tobeTruthy();
      expect(v).toBeFalsy();
      done();
    }
  });
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});


/* Test infrastructure */

let localServer = null;

beforeAll((done) => {
  distribution.node.start((server) => {
    localServer = server;
    done();
  });
});

afterAll((done) => {
  localServer.close();
  done();
});
