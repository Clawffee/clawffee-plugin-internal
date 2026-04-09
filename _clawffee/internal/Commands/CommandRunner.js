//@ts-check
const fs = require('fs');
const { join, sep, basename } = require('path');

let workingDirectory = process.cwd();

/**
 * @type {{[x: string]: Array<Function>}}
 */
globalThis.clawffeeInternals.fileCleanupFuncs = {}
/**
 * @type {{[x: string]: {
 * onLoad(path: string, str: string, initial: boolean, cmdObj: commandConfig): void, 
 * onUnload(path: string): void,
 * onRequire(path: string, str: string, initial: boolean, cmdObj: commandConfig): void,
 * }}}
 */
globalThis.clawffeeInternals.fileManagers = {};

/**
 * @typedef commandConfig
 * @prop {string} name
 * @prop {string} fullname
 * @prop {string?} sortname
 * @prop {string?} img
 * @prop {boolean} hidden
 * @prop {boolean} disabled
 * @prop {boolean} locked
 * @prop {boolean} errored
 * @prop {string[]} dependencies
 * @prop {string[]} dependers
 * @prop {?string} parent
 */
/**
 * @typedef {{childscripts: {[child: string]: commandConfig}, childfolders: {[child: string]: folderConfig}} & commandConfig} folderConfig
 */
/**
 * @type {folderConfig}
 */
const config = fs.existsSync('config/internal/commands.json')? JSON.parse(fs.readFileSync('config/internal/commands.json').toString()): {
    "name": "commands",
    "fullname": "commands",
    "sortname": null,
    "img": null,
    "hidden": false,
    "disabled": false,
    "dependencies": [],
    "dependers": [],
    "childfolders": {
        "examples": {
            "name": "examples",
            "fullname": "commands/examples",
            "sortname": null,
            "img": null,
            "hidden": true,
            "disabled": true,
            "dependencies": [],
            "dependers": [],
            "parent": "commands",
            "childfolders": {},
            "childscripts": {}
        }
    },
    "childscripts": {}
}
clawffeeInternals.commandConfig = config;


/**
 * 
 * @param {string} path 
 * @returns 
 */
function getCMDObject(path) {
    const folders = path.split(sep);
    let mgr = config;
    let fname;
    while(folders.length > 1) {
        fname = folders.shift() ?? "";
        mgr = mgr.childfolders[fname] ??= {
            name: fname,
            fullname: folders.join('/'),
            sortname: null,
            img: null,
            parent: mgr.name,
            dependencies: [],
            dependers: [],
            hidden: false,
            disabled: false,
            errored: false,
            locked: mgr.locked,
            childfolders: {},
            childscripts: {}
        };
    }
    return mgr;
}

/**
 * Unloads a commands at a given path
 * @param {string} path 
 */
function unloadCommand(path) {
    const fullPath = join(workingDirectory, path);
    if(!globalThis.clawffeeInternals.fileCleanupFuncs[fullPath]) return;
    globalThis.clawffeeInternals.fileCleanupFuncs[fullPath].forEach((v) => {try {v()} catch(e) {console.error(e)}});
    for (const ending in globalThis.clawffeeInternals.fileManagers) {
        if (!Object.hasOwn(globalThis.clawffeeInternals.fileManagers, ending) || !path.endsWith(ending)) continue;
        const mgr = globalThis.clawffeeInternals.fileManagers[ending];
        try {
            mgr.onUnload?.(path);
        } catch(e) {
            console.error(e);
        }
    }
    console.log(`- ${path}`);
}
/**
 * Loads the commands at a given path
 * @param {commandConfig | string} cmdObj file path
 * @param {string} content file contents
 * @param {boolean} force force load file (load file even if the file has already been loaded)
 */
function loadCommand(cmdObj, content, force=false) {
    if(typeof cmdObj == 'string') {
        cmdObj = getCMDObject(cmdObj).childscripts[basename(cmdObj)];
        if(!cmdObj) throw TypeError('There is no command defined at the given path!');
    }
    const path = cmdObj.fullname;
    console.log(`+ ${path}`);
    const fullPath = join(workingDirectory, path);
    try {
        for (const ending in globalThis.clawffeeInternals.fileManagers) {
            if (!Object.hasOwn(globalThis.clawffeeInternals.fileManagers, ending) || !path.endsWith(ending)) continue;
            const mgr = globalThis.clawffeeInternals.fileManagers[ending];
            const ret = (mgr.onLoad ?? mgr.onRequire)?.(fullPath, content, force, cmdObj);
            cmdObj.errored = false;
            return ret;
        }
    } catch(err) {
        unloadCommand(path);
        cmdObj.errored = true;
        throw err;
    }
}

module.exports = {
    unloadCommand,
    loadCommand,
    getCMDObject
}