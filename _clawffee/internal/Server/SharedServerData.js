//@ts-check
const { createServer } = require('./Subscribable.js');
/**
 * @type {{[x: string]: any}}
 */
clawffeeInternals.sharedServerData = createServer({internal: {}});

module.exports = {
    sharedServerData: clawffeeInternals.sharedServerData
}