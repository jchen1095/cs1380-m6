/** @typedef {import("../types").Callback} Callback */

function routes(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function put(service, name, callback = () => { }) {
    // console.log(service)
    // console.log(name)
    global.distribution[context.gid].comm.send([service, name], {service: 'routes', method: 'put'}, (e,v) => {
      callback(e,v);
    });
  }

  /**
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function rem(service, name, callback = () => { }) {
    console.log(service)
    console.log(name)
    global.distribution[context.gid].comm.send([service, name], {service: 'routes', method: 'rem'}, (e,v) => {
      callback(e,v);
    });
  }

  return {put, rem};
}

module.exports = routes;
