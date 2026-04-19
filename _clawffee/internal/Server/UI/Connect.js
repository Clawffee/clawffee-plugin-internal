//@ts-check
let port = "4444";
try {
    let {port: portunclean} = require('../../../../../../config/internal/server.json');
    port = String(portunclean ?? "4444");
} catch(e) {
}
/**
 * 
 * @param {string} str 
 */
function convertURL(str = port) {
    if(parseInt(str)) return `localhost:${str}`;
    return str;
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
        if(!firstMsg) return firstMsg = true;
        call(data.p ?? [], data.v);
    }
}
reconnect(5000);

/**
 * 
 * @param {string | string[]} path 
 * @param {(restPath: string[], value: any) => void} callback 
 */
globalThis.listenToClawffee = (path, callback) => {
    if(typeof path == 'string') {
        path = path.split('/');
    }
    create((dpath, data) => {
        if(path.some((v, i) => dpath[i] != v)) return;
        callback(dpath.slice(path.length), data);
    });
}