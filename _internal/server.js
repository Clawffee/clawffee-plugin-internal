//@ts-check
const { associateFunctionWithFile } = require("./codeBinder");


/**
 * @callback URLCallback
 * 
 * @param {Request} request
 * @param {URL} url
 */

//TODO add / to the start and end of path if not existant
/**
 * 
 * @param {string} path 
 * @param {URLCallback} callback 
 * @returns 
 */
function setFunction(path, callback) {
    globalThis.clawffeeInternals.serverFunctions[path] = callback;
    return associateFunctionWithFile(() => {
        if (callback == globalThis.clawffeeInternals.serverFunctions[path])
            delete globalThis.clawffeeInternals.serverFunctions[path];
    });
}

module.exports = {
    sharedServerData: clawffeeInternals.sharedServerData, setFunction
}