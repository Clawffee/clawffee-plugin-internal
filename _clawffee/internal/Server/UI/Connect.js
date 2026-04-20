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
 * @type {WebSocket}
 */
let ws;
const {create, call} = /**@type {import('../../Hooks/HookHelper').HookHelper<(path: string[], data: any) => void>} **/ (require('../../Hooks/HookHelper').simpleHookMgr());
const {create: createAlways, call: callAlways} = /**@type {import('../../Hooks/HookHelper').HookHelper<(path: string[], data: any) => void>} **/ (require('../../Hooks/HookHelper').simpleHookMgr());

function getSubObject(path) {
    
}

/**
 * 
 * @param {number} timeout 
 */
function reconnect(timeout=0) {
    if(ws) ws.close();
    let nextTimeout = (timeout == 0)? 5000 : timeout * 3;
    let msg = setTimeout(() => console.log("Connecting to Clawffee..."), 200);
    let firstMsg = true
    ws = new WebSocket(`ws://${url}`);
    ws.onopen = () => {
        console.info("Connected to Clawffee!");
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
        callAlways(data.p ?? [], data.v);
        if(!firstMsg) return firstMsg = true;
        call(data.p ?? [], data.v);
    }
}
window.onload = () => {
    setTimeout(() => reconnect(5000), 1);
}

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
        if(path.some((v, i) => dpath[i] != v)) return;
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
    createAlways((dpath, data) => {
        if(path.some((v, i) => dpath[i] != v)) return;
        callback(dpath.slice(path.length), data);
    });
}

globalThis.listenToClawffee = listenToClawffee;

globalThis.getFromClawffee = getFromClawffee;