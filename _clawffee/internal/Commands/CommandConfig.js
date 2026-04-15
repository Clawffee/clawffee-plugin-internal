//@ts-check

const { sep } = require('path');
const fs = require('fs');
const { simpleHookMgr } = require('../Hooks/HookHelper');

const confPath = 'config/internal/commands.json';

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
const config = fs.existsSync(confPath)? JSON.parse(fs.readFileSync(confPath).toString()): {
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

const {create: subToCommandChanges, call: callHooks} = /**@type {import('../Hooks/HookHelper').HookHelper<(path: string, cmdObj: commandConfig) => void>} */ (simpleHookMgr());

/**
 * 
 * @param {string} path 
 * @param {{sortname?: string, img?: string, hidden?: boolean, disabled?: boolean}} update 
 */
function changeCommandConfig(path, update) {
    const cmd = getCMDObject(path);
    path = cmd.fullname;
    cmd.sortname = update.sortname ?? cmd.sortname;
    cmd.img = update.img ?? cmd.img;
    cmd.hidden = update.hidden ?? cmd.hidden;
    if(update.disabled !== undefined) {
        const updateDeps = cmd.disabled != update.disabled;
        cmd.disabled = update.disabled;
        if(updateDeps) {
            //TODO: implement
        }
    }
    callHooks(path, cmd).filter(Boolean).forEach(console.error);
}

module.exports = {
    getCMDObject,
    changeCommandConfig,
    subToCommandChanges
}