//@ts-check
const { createServer } = require('./Subscribable.js');

/**
 * @type {any}
 */
const sharedServerData = createServer({internal: {}});
globalThis.sharedServerData = sharedServerData;
module.exports = {
    sharedServerData
}