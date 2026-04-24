//@ts-check

import config from '../../../../../../config/internal/server.json';
/**
 * https://stackoverflow.com/a/22706073
 * @param {string} str
 */
function escapeHTML(str) {
    return new Option(str).innerHTML;
}
/**
 * @typedef consoleState
 *
 * @prop {string?} color
 * @prop {string?} bg
 * @prop {boolean} bold
 * @prop {boolean} transparent
 * @prop {boolean} italic
 * @prop {boolean} underline
 * @prop {boolean} blink
 * @prop {boolean} inverse
 * @prop {boolean} hidden
 * @prop {boolean} strikethrough
 * @prop {number} curLine
 * @prop {number} curCol
 */
/**
 * 
 * @param {{parts: {text: string, wrap: string}[], depth: number}[]} output 
 * @param {string} txt 
 * @param {consoleState} consoleState 
 * @returns 
 */
function adjustState(output, txt, consoleState) {
    const reg = /\[([0-9;]*)(.)(.*)/.exec(txt);
    if (!reg) return;
    switch(reg[2]) {
        case 'm':
            reg[1].split(';').forEach((v) => {
                if(v == '0') {
                    consoleState.color = null;
                    consoleState.bg = null;
                    consoleState.bold = false;
                    consoleState.transparent = false;
                    consoleState.italic = false;
                    consoleState.underline = false;
                    consoleState.blink = false;
                    consoleState.inverse = false;
                    consoleState.hidden = false;
                    consoleState.strikethrough = false;
                    return;
                }
                if(v == '1') return consoleState.bold = true;
                if(v == '21') return consoleState.bold = false;
                if(v == '2') return consoleState.transparent = true;
                if(v == '22') return consoleState.transparent = false;
                if(v == '3') return consoleState.italic = true;
                if(v == '23') return consoleState.italic = false;
                if(v == '4') return consoleState.underline = true;
                if(v == '24') return consoleState.underline = false;
                if(v == '5') return consoleState.blink = true;
                if(v == '25') return consoleState.blink = false;
                if(v == '6') return consoleState.inverse = true;
                if(v == '26') return consoleState.inverse = false;
                if(v == '7') return consoleState.hidden = true;
                if(v == '27') return consoleState.hidden = false;
                if(v == '9') return consoleState.strikethrough = true;
                if(v == '29') return consoleState.strikethrough = false;
                const colmap = {
                    "30": 'var(--bs-black)',
                    "31": 'var(--bs-red)',
                    "32": 'var(--bs-green)',
                    "33": 'var(--bs-yellow)',
                    "34": 'var(--bs-blue)',
                    "35": 'var(--bs-purple)',
                    "36": 'var(--bs-cyan)',
                    "37": 'var(--bs-white)',
                    "39": 'var(--bs-tertiary-color)',
                    "90": 'var(--bs-gray)',
                    "91": 'var(--bs-danger)',
                    "92": 'var(--bs-success)',
                    "93": 'var(--bs-warning)',
                    "94": 'var(--bs-blue)',
                    "95": 'var(--bs-purple)',
                    "96": 'var(--bs-info)',
                    "97": 'var(--bs-white)',
                };
                // @ts-ignore
                if(colmap[v]) return consoleState.color = colmap[v];
                const bgmap = {
                    "40": 'var(--bs-black)',
                    "41": 'var(--bs-red)',
                    "42": 'var(--bs-green)',
                    "43": 'var(--bs-yellow)',
                    "44": 'var(--bs-blue)',
                    "45": 'var(--bs-purple)',
                    "46": 'var(--bs-cyan)',
                    "47": 'var(--bs-white)',
                    "49": 'var(--bs-tertiary-color)',
                    "100": 'var(--bs-gray)',
                    "101": 'var(--bs-danger)',
                    "102": 'var(--bs-success)',
                    "103": 'var(--bs-warning)',
                    "104": 'var(--bs-blue)',
                    "105": 'var(--bs-purple)',
                    "106": 'var(--bs-info)',
                    "107": 'var(--bs-white)',
                };
                // @ts-ignore
                if(bgmap[v]) return consoleState.bg = bgmap[v];
            });
            break;
        case 'D':
            if(isNaN(parseInt(reg[1]))) break;
            consoleState.curCol -= parseInt(reg[1]);
            break;
        //TODO: add more states
    }
    insertTxt(output, reg[3], consoleState);
}
/**
 * 
 * @param {consoleState} consoleState 
 */
function createWrap(consoleState) {
    return 'style="'
        + (consoleState.bg?"background-color:" + consoleState.bg + ";":"")
        + (consoleState.color?"color:" + consoleState.color + ";":"")
        + (consoleState.transparent?"opacity: 50%;":"")
        + (consoleState.bold?"font-weight: bold;":"")
        + (consoleState.hidden?"opacity: 0%;":"")
        + (consoleState.italic?"font-style: italic;":"")
        + (consoleState.underline?"text-decoration: underline;":"")
        + '"'
}
/**
 * 
 * @param {{parts: {text: string, wrap: string}[], depth: number}[]} output 
 * @param {string} txt 
 * @param {consoleState} consoleState 
 */
function insertTxt(output, txt, consoleState) {
    const line = output[consoleState.curLine] ??= {parts: [{text: "", wrap: ""}], depth: 0};
    if(consoleState.curCol <= 0) {
        line.depth -= consoleState.curCol;
        consoleState.curCol = 0;
    }
    let col = consoleState.curCol;
    consoleState.curCol += txt.length;
    let p = 1;
    let writeInto = line.parts[0];
    while(writeInto && col >= writeInto.text.length) {
        col -= writeInto.text.length;
        writeInto = line.parts[p];
        p++;
    }
    if(writeInto) {
        line.parts.splice(p, 0, {
            text: writeInto.text.substring(col),
            wrap: writeInto.wrap
        });
        writeInto.text = writeInto.text.substring(0, col);
        let l = txt.length + col;
        while(l > 0 && writeInto) {
            if(l > writeInto.text.length) {
                l -= writeInto.text.length;
                line.parts.splice(p, 1);
                writeInto = line.parts[p];
            } else {
                writeInto.text = writeInto.text.substring(l);
                l = 0;
            }
        }
    } else {
        txt = " ".repeat(col) + txt;
    }
    line.parts.splice(p, 0, {
        text: txt,
        wrap: createWrap(consoleState)
    });
}

/**
 * @param {string} txt
 * @returns {string}
 */
function consoleifyString(txt) {
    /**
     * @type {{parts: {text: string, wrap: string}[], depth: number}[]}
     */
    const output = [];
    const lines = txt.split('\n');
    const consoleState = {
        color: null,
        bg: null,
        bold: false,
        transparent: false,
        italic: false,
        underline: false,
        blink: false,
        inverse: false,
        hidden: false,
        strikethrough: false,
        curLine: 0,
        curCol: 0,
        depth: 0
    };
    lines.forEach(line => {
        const values = line.split('\u001b');
        insertTxt(output, values[0], consoleState);
        values.slice(1).forEach(v => {
            adjustState(output, v, consoleState);
        });
        consoleState.curLine++;
        consoleState.curCol = consoleState.depth;
    });

    return output.reduce((p, v) => p + `<div style="translate: -${v.depth}ch">` + v.parts.reduce((p, v) => p+ "<span " + v.wrap + ">" + v.text.replaceAll('<','&gt;').replaceAll('>','&lt;').replaceAll(' ', '&MediumSpace;') + "</span>", "") + "</div>", "");
}
/**
 * @type {{name: string, line: string, cls: string, text: string}[]}
 */
const consoleCache = [];
/**
 * @type {HTMLElement}
 */
let consoleWindow;
const windowURL = /[^\/]*.$/.exec(window.location.href)?.[0] ?? "localhost:4444";
/**
 * @param {string} name
 * @param {string} line
 * @param {string} cls
 * @param {string} text
 */
function addToConsole(name, line, cls, text) {
    if (!consoleWindow) return consoleCache.push({ name, line, cls, text });
    const nameobj = document.createElement('div');
    nameobj.appendChild(document.createElement('div'));
    //@ts-ignore
    nameobj.firstElementChild.appendChild(document.createElement('div'));
    //@ts-ignore
    nameobj.firstElementChild.appendChild(document.createElement('div'));
    //@ts-ignore
    nameobj.firstElementChild.firstElementChild.innerHTML = consoleifyString(name);
    //@ts-ignore
    nameobj.firstElementChild.lastElementChild.innerHTML = consoleifyString(line);
    const textobj = document.createElement('div');
    textobj.innerHTML = consoleifyString(text);
    if (cls) {
        nameobj.style.setProperty('--text-color', cls);
        textobj.style.setProperty('--text-color', cls);
    }
    consoleWindow.appendChild(nameobj);
    consoleWindow.appendChild(textobj);
    if (consoleWindow.childElementCount > 200) {
        //@ts-ignore
        consoleWindow.removeChild(consoleWindow.firstElementChild);
        //@ts-ignore
        consoleWindow.removeChild(consoleWindow.firstElementChild);
        //@ts-ignore
        consoleWindow.removeChild(consoleWindow.firstElementChild);
        //@ts-ignore
        consoleWindow.removeChild(consoleWindow.firstElementChild);
    }
    consoleWindow.lastElementChild?.scrollIntoView();
}
window.onload = () => {
    //@ts-ignore
    consoleWindow = document.getElementById("consoleWindow");
    let v;
    while (v = consoleCache.shift()) addToConsole(v.name, v.line, v.cls, v.text);
    globalThis.listenToClawffee(["log"], (rpath, data) => {
        if(rpath[0] == 'debug' && !config.printDebug) {
            return;
        }
        const clsmap = {
            "info": "var(--bs-primary)",
            "error": "var(--bs-danger)",
            "warn": "var(--bs-warning)",
            "log": "var(--bs-tertiary-color)",
            "debug": "var(--bs-gray)",
        };
        const namesplit = /(.*):([^:]*:[^:]*)/.exec(data.smallname);
        // @ts-ignore
        addToConsole(namesplit?.[1] ?? "[unknown]", ":" + (namesplit?.[2] ?? ""), clsmap[rpath[0]] ?? null, data.cleaneddata);
    })
};
/**
 * 
 * @param {string} name 
 * @param {string} cls 
 */
function wrapCons(name, cls) {
    // @ts-ignore
    const bak = console[name];
    // @ts-ignore
    console[name] = (...data) => {
        const stack = {};
        // @ts-ignore
        Error.captureStackTrace(stack, console[name]);
        // @ts-ignore
        const line = stack.stack.split('\n').map(v => /([^\/]*.)(:\d+:\d+)$/.exec(v)).filter(Boolean)[0];
        let n = line?.[1];
        if (n?.startsWith(windowURL)) {
            n = "UI" + n.substring(windowURL.length);
        }
        bak(line?.[0], ...data);
        addToConsole(n ?? "[unknown]", line?.[2] ?? "", cls, data.map(v => (typeof v == 'object') ? JSON.stringify(v) : String(v)).join(' '));
    }
}
wrapCons('info', "var(--bs-primary)");
wrapCons('error', "var(--bs-danger)");
wrapCons('warn', "var(--bs-warning)");
wrapCons('log', "var(--bs-tertiary-color)");

window.addEventListener('error', (event) => {
    let n = event.filename;
    if (n?.startsWith(windowURL)) {
        n = "UI" + n.substring(windowURL.length);
    }
    addToConsole('\u001b[31m' + n, event.lineno + ":" + event.colno, "var(--bs-danger)", '\u001b[31m' + event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    addToConsole("\u001b[31m[async error]", "", "var(--bs-danger)", '\u001b[31m' + event.reason);
});