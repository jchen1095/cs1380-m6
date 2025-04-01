const distribution = require('../../config.js');

/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const id = distribution.util.id;


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  const g = {
    'al57j': {ip: '127.0.0.1', port: 9092},
    'q5mn9': {ip: '127.0.0.1', port: 9093},
  };

  distribution.group4.groups.put('atlas', g, (e, v) => {
    distribution.group4.groups.get('atlas', (e, v) => {
      distribution.group4.groups.rem('atlas','al57j', (e, v) => {
        // expect(v).toEqual({'al57j':{ip:'127.0.0.1', port: 9092}});
        distribution.group4.groups.get('atlas', (e, v) => {
          try {
            console.log(v)
            expect(v['d3406']).toEqual({'q5mn9':{ip: '127.0.0.1', port: 9093}});
            done();
            // expect(e).toBeDefined();
            // Object.keys(e).forEach((k) => {
            //   expect(e[k]).toBeInstanceOf(Error);
            //   expect(v).toEqual({});
            // });
            // done();
          } catch (error) {
            done(error);
          }
        });
      });
    });
  });
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
    
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

  //   for(let i= 0; i < 10; i++) {
  //     distribution.mygroup.status.stop((e, v) => {
  //     const remote = {service: 'status', method: 'stop'};
  //     remote.node = n1;
  //     distribution.local.comm.send([], remote, (e, v) => {
  //       remote.node = n2;
  //       distribution.local.comm.send([], remote, (e, v) => {
  //         remote.node = n3;
  //         distribution.local.comm.send([], remote, (e, v) => {
  //           remote.node = n4;
  //           distribution.local.comm.send([], remote, (e, v) => {
  //             remote.node = n5;
  //             distribution.local.comm.send([], remote, (e, v) => {
  //               remote.node = n6;
  //               distribution.local.comm.send([], remote, (e, v) => {
  //                 distribution.local.status.spawn(n1, (e, v) => {
  //                   distribution.local.status.spawn(n2, (e, v) => {
  //                     distribution.local.status.spawn(n3, (e, v) => {
  //                       distribution.local.status.spawn(n4, (e, v) => {
  //                         distribution.local.status.spawn(n5, (e, v) => {
  //                           distribution.local.status.spawn(n6, () => {
  //                             localServer.close();
  //                             done();
  //                           });
  //                         })
  //                       })
  //                     })
  //                   })
  //                 })
  //               })
  //             })
  //           })
  //         })
  //       })
  //     })
  //   })
  // }
});
  



/* Infrastructure for the tests */

// This group is used for testing most of the functionality
const mygroupGroup = {};
// These groups are used for testing hashing
const group1Group = {};
const group2Group = {};
const group4Group = {};
const group3Group = {};

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

  group1Group[id.getSID(n4)] = n4;
  group1Group[id.getSID(n5)] = n5;
  group1Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n3)] = n3;
  group4Group[id.getSID(n5)] = n5;

  group3Group[id.getSID(n2)] = n2;
  group3Group[id.getSID(n4)] = n4;
  group3Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n2)] = n2;
  group4Group[id.getSID(n4)] = n4;

  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;

    const groupInstantiation = (e, v) => {
      const mygroupConfig = {gid: 'mygroup'};
      const group1Config = {gid: 'group1', hash: id.naiveHash};
      const group2Config = {gid: 'group2', hash: id.consistentHash};
      const group3Config = {gid: 'group3', hash: id.rendezvousHash};
      const group4Config = {gid: 'group4'};

      // Create some groups
      distribution.local.groups
          .put(mygroupConfig, mygroupGroup, (e, v) => {
            distribution.local.groups
                .put(group1Config, group1Group, (e, v) => {
                  distribution.local.groups
                      .put(group2Config, group2Group, (e, v) => {
                        distribution.local.groups
                            .put(group3Config, group3Group, (e, v) => {
                              distribution.local.groups
                                  .put(group4Config, group4Group, (e, v) => {
                                    done();
                                  });
                            });
                      });
                });
          });
    };

    // Start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          distribution.local.status.spawn(n4, (e, v) => {
            distribution.local.status.spawn(n5, (e, v) => {
              distribution.local.status.spawn(n6, groupInstantiation);
            });
          });
        });
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
          remote.node = n4;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n5;
            distribution.local.comm.send([], remote, (e, v) => {
              remote.node = n6;
              distribution.local.comm.send([], remote, (e, v) => {
                localServer.close();
                done();
              });
            });
          });
        });
      });
    });
  });
});


