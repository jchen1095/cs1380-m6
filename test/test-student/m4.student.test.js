/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    let nums = [];
    for(let i =0; i < 1000; i++) {
      nums.push(Math.random());
    }
    let count = 0;
    iterations = 1000;
    let startTime = Date.now();
    for(let i=0; i < iterations; i++) {
      
      distribution.mygroup.mem.put(nums[i], id.getID(nums[i]), (e,v) => {
        expect(e).toBeFalsy();
        count ++;
        if(count >= iterations) {
          // check timer, print, start new, get
          let endTime = Date.now();
          let duration = endTime - startTime;
          console.log(`Throughput Test: Serialized and deserialized ${iterations} objects in ${duration} ms`);
          console.log(`Throughput Test: ${iterations/ (duration / 1000)} operations per second`);          
          startTime = Date.now()
          let count2 = 0
          for(let j = 0; j < iterations; j++) {
            distribution.mygroup.mem.get(id.getID(nums[i]), (e,v) => {
              expect(e).toBeFalsy();
              expect(v).toBeTruthy();
              count2++;
              if (count2 >= iterations) {
                endTime = Date.now()
                duration = endTime-startTime
                console.log(`Throughput Test: Serialized and deserialized ${iterations} objects in ${duration} ms`);
                console.log(`Throughput Test: ${iterations/ (duration / 1000)} operations per second`);          
                // stop timer, print
                done();
              }
              
            })
          }
        }
      })
    }

    for(let i =0; i < 1000; i++) {
      
    }
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

test('(1 pts) student test', (done) => {
  // Fill out this test case...
    done(new Error('Not implemented'));
});


/*
  Testing infrastructure code.
*/

// This group is used for testing most of the functionality
const mygroupGroup = {};

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 8000};
const n2 = {ip: '127.0.0.1', port: 8001};
const n3 = {ip: '127.0.0.1', port: 8002};
const n4 = {ip: '127.0.0.1', port: 8003};
const n5 = {ip: '127.0.0.1', port: 8004};
const n6 = {ip: '127.0.0.1', port: 8005};


beforeAll((done) => {
  // First, stop the nodes if they are running
  const remote = {service: 'status', method: 'stop'};

  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n6;
            distribution.local.comm.send([], remote, (e, v) => {
            });
          });
        });
      });
    });
  });

  mygroupGroup[id.getSID(n1)] = n1;
  mygroupGroup[id.getSID(n2)] = n2;
  mygroupGroup[id.getSID(n3)] = n3;
  
  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;

    const groupInstantiation = (e, v) => {
      const mygroupConfig = {gid: 'mygroup'};

      // Create some groups
      distribution.local.groups
          .put(mygroupConfig, mygroupGroup, (e, v) => {
            done()
  })};

    // Start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, groupInstantiation);
      });
    });
  });
});

afterAll((done) => {
  distribution.mygroup.status.stop((e, v) => {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n2;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n3;
        distribution.local.comm.send([], remote, (e, v) => {
        });
      });
    });
  });
});
