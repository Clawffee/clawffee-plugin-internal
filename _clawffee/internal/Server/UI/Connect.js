//@ts-check
let port = "4444";
import data from '../../../../../../config/internal/server.json';
port = String(data.port ?? "4444");
/**
 * 
 * @param {string} str 
 */
function convertURL(str = port) {
    return (
        (document.querySelector('meta[clawffee_url]')?.attributes.getNamedItem('clawffee_url')?.value ?? `localhost:${port}`)
        + (document.querySelector('meta[clawffee_path]')?.attributes.getNamedItem('clawffee_path')?.value ?? "/")
    )
}
const url = convertURL(
    document.querySelector('meta[clawffee_url]')
        ?.attributes.getNamedItem('clawffee_url')
        ?.value
);
/**
 * @type {any}
 */
let backup;
/**
 * @type {WebSocket}
 */
let ws;
const {create, call} = /**@type {import('../../Hooks/HookHelper').HookHelper<(path: string[], data: any) => void>} **/ (require('../../Hooks/HookHelper').simpleHookMgr());
const {create: createAlways, call: callAlways} = /**@type {import('../../Hooks/HookHelper').HookHelper<(path: string[], data: any) => void>} **/ (require('../../Hooks/HookHelper').simpleHookMgr());

/**
 *  
 * @param {string[]} path 
 * @param {any} obj 
 */
function getSubObject(path, obj) {
    path = [...path];
    let p;
    while(obj !== undefined && (p = path.shift())) {
        //@ts-ignore
        obj = obj[p];
    }
    return obj;
}

let firstConnect = true;
/**
 * 
 * @param {number} timeout 
 */
function reconnect(timeout=0) {
    if(ws) ws.close();
    let nextTimeout = (timeout == 0)? 125 : timeout * 2;
    let msg = setTimeout(() => console.log("Connecting to Clawffee..."), 200);
    let firstMsg = true
    ws = new WebSocket(`ws://${url}`);
    ws.onopen = () => {
        if(!firstConnect) console.info("Reconnected to Clawffee!");
        firstConnect = false;
        timeout = 0;
        nextTimeout = 0;
        clearTimeout(msg);
    };
    ws.onclose = () => {
        if(timeout == 0) console.warn(`Disconnected from Clawffee! Reconnecting...`);
        else console.warn(`Cannot connect to Clawffee! Reconnecting in ${Math.floor(timeout / 1000)} seconds...`)
        setTimeout(reconnect, timeout, nextTimeout);
    }
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        data.p ??= [];
        if(data.p.length == 0) {
            backup = data.v;
        } else {
            getSubObject(data.p.slice(0, data.p.length-1), backup)[data.p[data.p.length-1]] = data.v;
        }
        callAlways(data.p, data.v);
        if(!firstMsg) return firstMsg = true;
        call(data.p, data.v);
    }
}
window.addEventListener('load', () => {
    setTimeout(() => reconnect(5000), 1);
});

/**
 * 
 * @param {string | string[]} path 
 * @param {(restPath: string[], value: any) => void} callback 
 */
export function listenToClawffee(path, callback) {
    if(typeof path == 'string') {
        path = path.split('/');
    }
    create((dpath, data) => {
        if(path.some((v, i) => dpath[i] && dpath[i] != v)) return;
        data = getSubObject(path.slice(dpath.length), data);
        callback(dpath.slice(path.length), data);
    });
}
/**
 * 
 * @param {string | string[]} path 
 * @param {(restPath: string[], value: any) => void} callback 
 */
export function getFromClawffee(path, callback) {
    if(typeof path == 'string') {
        path = path.split('/');
    }
    if(backup !== undefined) {
        const x = getSubObject(path, backup);
        if(x !== undefined) callback([], x);
    }
    createAlways((dpath, data) => {
        if(path.some((v, i) => dpath[i] && dpath[i] != v)) return;
        data = getSubObject(path.slice(dpath.length), data);
        callback(dpath.slice(path.length), data);
    });
}

globalThis.listenToClawffee = listenToClawffee;

globalThis.getFromClawffee = getFromClawffee;