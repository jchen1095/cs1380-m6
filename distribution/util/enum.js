/**
 * Enum for different types of operations through notify
 */
const NotifyOps = Object.freeze({
    // Operations received by workers
    REGISTER_FUNCTIONS: 0,
    COMMAND_MAP: 1,
    COMMAND_SHUFFLE: 2,
    COMMAND_REDUCE: 3,
    TEARDOWN: 4,

    // Operations received by the orchestrator
    MAP_DONE: 5,
    SHUFFLE_DONE: 6,
    REDUCE_DONE: 7
});

module.exports = { NotifyOps }