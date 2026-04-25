//@ts-check
const { associateFunctionWithFile } = require("./codeBinder");
const globals = require('#globals')

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
    globals.serverFunctions[path] = callback;
    return associateFunctionWithFile(() => {
        if (callback == globals.serverFunctions[path])
            delete globals.serverFunctions[path];
    });
}

module.exports = {
    sharedServerData: globals.sharedServerData,
    setFunction
}