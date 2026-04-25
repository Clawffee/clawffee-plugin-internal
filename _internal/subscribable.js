//@ts-check
const { associateFunctionWithFile } = require("./codeBinder");
const globals = require('#globals')
/**
 * 
 * @param {*} server 
 * @param {string} path 
 * @param {import('../_clawffee/internal/Server/Subscribable').ServableListener} callback 
 * @param {{ activateIfUnchanged: boolean; activateFromParent: boolean; suppressInitialSet: boolean; multiple: boolean; }?} config
 * @returns 
 */
function addListener(server, path, callback, config) {
    const retObj = globals.subscribables.addListener(server, path, callback, config ?? undefined);
    associateFunctionWithFile(retObj.removeSelf.bind(retObj));
    return retObj;
}

module.exports = {
    apply: globals.subscribables.apply,
    createServer: globals.subscribables.createServer,
    addListener: addListener
};