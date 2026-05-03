//@ts-check
const { createServer } = require('./Subscribable.js');

/**
 * @type {{[x: string]: any}}
 */
const sharedServerData = createServer({internal: {}});
globalThis.sharedServerData = sharedServerData;
module.exports = {
    sharedServerData
}