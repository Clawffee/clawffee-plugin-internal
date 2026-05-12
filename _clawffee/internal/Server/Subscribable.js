//@ts-check
/*
server: {                                               
┌►"a": {                                        
│   "a": 2                                      
│ },                                            
│ "b": {                                        
│                                               
│ },                                            
└─"c": ["Reference to a"]                       
}                                               
        │                                       
        ▼                                       
parentListeners: {                              
  "Reference to server": [],                      
  "Reference to a": [                           
    [["Reference to server"], "a"],               
    [["Reference to server"], "c"]                
  ],                                            
  "Reference to b": [["Reference to server"], "b"]
}                                               
        │                                       
        ▼                                       
listenerTree: {                                 
  "ownListeners": {                             
    "b": []                                     
  },                                            
  "childListeners": {                           
    "c": {                                      
      "ownListeners": {"a": []},                
      "childListeners": {}                      
    }                                           
  }                                             
}                                               
                                                
 ────────────                                   
                                                
server.a.a = 5                                  
  => server.a changed a from 2 to 5             
    => server changed a.a from 2 to 5           
  => server.c changed a from 2 to 5             
    => server changed c.a from 2 to 5           
  Repeat upwards too!!                          
*/

/**
 * @typedef ListenerConfig
 * @property {Boolean} activateFromParent
 */
/**
 * @typedef ListenerData
 * 
 * @property {import('../Hooks/HookHelper').HookHelper<ServableListener>} ownListeners
 * @property {Map<string, ListenerData>} childListeners
 */
const { simpleHookMgr } = require('../Hooks/HookHelper');
/**
 * Link between objects and their corresponding Proxy, used to get the Proxy when setting values on the original object
 * @type {WeakMap<any, ProxyData> }
 */
const ProxyObjDict = new WeakMap();

/**
 * @callback ServableListener
 * @param {string[]} path the relative path that was changed from the object that is being listened to
 * @param {object} newValue the new value of the object at the relative path
 * @param {object} oldValue the old value of the object at the relative path
 * @param {object} self the value at the path
 * @param {ListenerConfig} config extra data about the set operation
 */
/**
 * @typedef ProxyData
 * @prop {Listenable<any>} orig
 * @prop {ListenerData} Listeners
 * @prop {Map<ProxyData, Set<string>>} Parents
 */


/**
 * Splits a string into a path
 * @param {string[]|string} path 
 * @returns {string[]}
 */
function splitString(path) {
    if(typeof path != "string") {
        return path;
    }
    return path.split(/\.|\[|\]/).filter(Boolean);
}

/**
 * 
 * @param {ProxyData} listenable 
 * @param {string[]} path 
 * @param {any} newValue 
 * @param {any} prevValue
 */
function callback(listenable, path, newValue, prevValue, cache=new Set()) {
    if(cache.has(listenable)) return;
    cache.add(listenable);
    /**
     * 
     * @param {ListenerData} listener
     * @param {string[]} path 
     * @param {any} newValue
     * @param {any} prevValue
     * @param {any} self
     * @param {ListenerConfig} config
     */
    function callListeners(listener, path, newValue, prevValue, self, config) {
        if(path[0]) {
            let l;
            if(l = listener.childListeners.get(path[0])) callListeners(l, path.slice(1), newValue, prevValue, self?.[path[0]], config);
        } else {
            config.activateFromParent = true;
            for(let l of listener.childListeners.entries()) {
                callListeners(l[1], [], newValue?.[l[0]], prevValue?.[l[0]], prevValue?.[l[0]], config);
            }
        }
        listener.ownListeners.call(path, newValue, prevValue, self, config);
    }
    callListeners(listenable.Listeners, path, newValue, prevValue, listenable.orig, {activateFromParent: false});
    listenable.Parents.forEach((v, k) => {
        v.forEach(p => {
            callback(k, [p, ...path], newValue, prevValue, cache);
        });
    });
    cache.delete(listenable);
}

/**
 * @typedef {{[x in keyof T]: T[x] extends object?Listenable<T[x]>:T[x]}} Listenable
 * @template {object} T
 */

/**
 * 
 * @param {Listenable<any>} obj 
 */
function applyChildren(obj) {
    const ListenData = ProxyObjDict.get(obj);
    if(!ListenData) return;
    Object.entries(obj).forEach(e => {
        if(typeof e[1] == 'object' && e[1] != null) {
            const x = proxyWrapper(e[1]);
            const ChildData = ProxyObjDict.get(x);
            if(!ChildData) return;
            if(!ChildData.Parents.has(ListenData)) ChildData.Parents.set(ListenData, new Set());
            ChildData.Parents.get(ListenData)?.add(e[0]);
        }
    });
}

/**
 * 
 * @param {T} obj
 * @returns {Listenable<T>}
 * @template {object} T
 */
function proxyWrapper(obj) {
    let ret1;
    //@ts-ignore
    if(ret1 = ProxyObjDict.get(obj)) return ret1.orig;
    /**
     * @type {ProxyData}
     */
    let ListenData;
    /**
     * @type {Listenable<T>}
     */
    //@ts-ignore
    const ret = new Proxy(obj, {
        get(target, p, receiver) {
            let v = Reflect.get(target, p, receiver);
            if(typeof p == 'symbol' || typeof v != 'object' || v == null) return v;
            return proxyWrapper(v);
        },
        set(target, p, newValue, receiver) {
            if(
                typeof p == 'string' && (
                    ListenData.Listeners.childListeners.has(p) 
                    || Object.keys(ListenData.Listeners.ownListeners).length > 0
                    || ListenData.Parents.size > 0
                )
            ) {
                const v = Reflect.get(target, p, receiver);
                if(typeof v == 'object' && v != null) {
                    const x = proxyWrapper(v);
                    const ChildData = ProxyObjDict.get(x);
                    if(ChildData) {
                        ChildData.Parents.get(ListenData)?.delete(p);
                        if((ChildData.Parents.get(ListenData)?.size ?? 1) == 0)
                            ChildData.Parents.delete(ListenData);
                    }
                }
                if(typeof newValue == 'object' && newValue != null) {
                    const x = proxyWrapper(newValue);
                    const ChildData = ProxyObjDict.get(x);
                    if(ChildData) {
                        if(!ChildData.Parents.has(ListenData)) ChildData.Parents.set(ListenData, new Set());
                        ChildData.Parents.get(ListenData)?.add(p);
                    }
                }
                callback(ListenData, [p], newValue, v);
            }
            return Reflect.set(target, p, newValue, receiver);
        },
        deleteProperty(target, p) {
            if(
                typeof p == 'string' && (
                    ListenData.Listeners.childListeners.has(p) 
                    || Object.keys(ListenData.Listeners.ownListeners).length > 0
                    || ListenData.Parents.size > 0
                )
            ) {
                const v = Reflect.get(target, p, target);
                if(typeof v == 'object' && v != null) {
                    const x = proxyWrapper(v);
                    const ChildData = ProxyObjDict.get(x);
                    if(ChildData) {
                        ChildData.Parents.get(ListenData)?.delete(p);
                        if((ChildData.Parents.get(ListenData)?.size ?? 1) == 0)
                            ChildData.Parents.delete(ListenData);
                    }
                }
                callback(ListenData, [p], null, v);
            }
            return Reflect.deleteProperty(target, p);
        }
    });
    ListenData = {
        orig: ret,
        Listeners: {
            childListeners: new Map(),
            ownListeners: simpleHookMgr()
        },
        Parents: new Map()
    }
    ProxyObjDict.set(obj, ListenData);
    ProxyObjDict.set(ret, ListenData);

    applyChildren(ret);

    return ret;
}
/**
 * add a listener to a Servable object
 * @param {Listenable<any>} obj - Server to attach to
 * @param {string | string[]} path - Path to listen to
 * @param {ServableListener} callback - Callback to be called when the value changes
 */
function addListener(obj, path, callback) {
    if(typeof path == 'string') {
        path = splitString(path);
    }
    const ListenData = ProxyObjDict.get(obj);
    if(!ListenData) throw "Shouldnt happen";
    let l = ListenData.Listeners;
    let a;
    while(a = path.shift()) {
        if(!l.childListeners.has(a)) {
            l.childListeners.set(a, {
                childListeners: new Map(),
                ownListeners: simpleHookMgr()
            })
        }
        //@ts-ignore
        l = l.childListeners.get(a);
    }
    return l.ownListeners.create(callback);
}

/**
 * Creates a server proxy object with the provided data.
 * @template {object} T
 * @param {T} obj - The initial data to be used for the server proxy.
 * @returns {Listenable<T>} The proxy object representing the server.
 */
//@ts-ignore
function createServer(obj={}) {
    return proxyWrapper(obj);
}

module.exports = {
    createServer,
    addListener
};