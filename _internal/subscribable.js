//@ts-check
const { associateFunctionWithFile } = require("./codeBinder");

/**
 * 
 * @param {*} server 
 * @param {string} path 
 * @param {import('../_clawffee/internal/Subscribable').ServableListener} callback 
 * @param {{ activateIfUnchanged: boolean; activateFromParent: boolean; suppressInitialSet: boolean; multiple: boolean; }?} config
 * @returns 
 */
function addListener(server, path, callback, config) {
    const retObj = globalThis.clawffeeInternals.subscribables.addListener(server, path, callback, config ?? undefined);
    associateFunctionWithFile(retObj.removeSelf.bind(retObj));
    return retObj;
}

module.exports = {
    apply: globalThis.clawffeeInternals.subscribables.apply,
    createServer: globalThis.clawffeeInternals.subscribables.createServer,
    addListener: addListener
};