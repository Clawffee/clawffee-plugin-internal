//@ts-check
/**
 * @template {Function} T
 * @typedef hook
 * @prop {T} func 
 * @prop {string} key
 * @prop {() => void} off
 * @prop {() => void} on
 * @prop {() => void} remove
 * @prop {() => void} add
 * @prop {() => void} enable
 * @prop {() => void} disable
 * @prop {() => void} subscribe
 * @prop {() => void} unsubscribe
 * @prop {symbol} [sym]
 */

/**
 * @type {symbol}
 */
//@ts-ignore
const sym = new Symbol();

/**
 * @template {(...args: any) => any} T
 */
function createHookMgr() {
    /**
     * @type {{[key: string]: hook<T>}}
     */
    const hooks = {};
    /**
     * @this {hook<T>}
     */
    function on() {
        //@ts-ignore
        if(!this[sym]) throw TypeError('Tried to enable a non Hook');
        hooks[this.key] = this;
    }
    /**
     * @this {hook<T>}
     */
    function off() {
        //@ts-ignore
        if(!this.sym) throw TypeError('Tried to disable a non Hook');
        delete hooks[this.key];
    }
    /**
     * 
     * @param {T} callback 
     * @returns {hook<T>}
     */
    function createHook(callback) {
        const key = Bun.randomUUIDv7();
        const mgr = {
            func: callback,
            get key() {return key},
            on: on,
            off: off,
            add: on,
            remove: off,
            enable: on,
            disable: off,
            subscribe: on,
            unsubscribe: off,
            [sym]: true
        }
        mgr.on();
        return mgr;
    }
    /**
     * @type {(...args: Parameters<T>) => any[]}
     */
    function callHooks(...args) {
        return Object.values(hooks)
            .map(v => {try {
                v.func(...args);
                return undefined;
            } catch(e) {
                return e;
            }});
    }
    return {create: createHook, call: callHooks}
}

module.exports = {createHookMgr}