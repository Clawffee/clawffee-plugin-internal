//@ts-check
const associatedObjects = {};
const globals = require('#globals')

/**
 * make an functions automatically unbind its outputs when it goes out of scope (and is GC'd)
 * @template {Function} T
 * @param {T} fn
 * @returns {T}
 */
function associateFunctionWithFile(fn) {
    const fileName = globals.getRunningScriptName();
    globals.fileCleanupFuncs[fileName]?.push(fn);
    return fn;
}


/**
 * make an object's functions automatically unbind its outputs when it goes out of scope (and is GC'd)
 * @template {object} T
 * @param {T} value 
 * @param {Array<(property: string | symbol) => boolean>} functionIdentifiers
 * @param {(value: any) => any} wrapper
 * @returns {T}
 */
function associateClassWithFile(value, functionIdentifiers, wrapper) {
    return new Proxy(value, {
        get(target, property, receiver) {
            const func = Reflect.get(target, property, receiver);
            if (functionIdentifiers.reduce((prev, curr) => prev || curr(property), false) && typeof func === 'function') {
                /**
                 * @type {(...args: any) => any}
                 */
                return (...args) => {
                    const ret = func.apply(value, args);
                    associateFunctionWithFile(wrapper(ret));
                    return ret;
                }
            }
            if(typeof func == 'object' && func)
                return associateClassWithFile(func, functionIdentifiers, wrapper);
            if(typeof func == 'function') {
                return func.bind(value);
            }
            return func;
        }
    });
}

module.exports = {
    associateFunctionWithFile,
    associateClassWithFile
}