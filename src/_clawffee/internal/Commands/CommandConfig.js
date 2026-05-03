//@ts-check

const { sep } = require('path');
const { simpleHookMgr } = require('../Hooks/HookHelper.js');
const { defaultenv } = require('tscheck');
const confPath = 'internal/commands.json';

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
defaultenv.parseType(`{
    name: string,
    fullname: string,
    sortname: string?,
    img: string?,
    hidden: boolean,
    disabled: boolean,
    locked: boolean,
    errored: boolean,
    dependencies: string[],
    dependers: string[],
    parent: string?
}`, "commandConfig");
/**
 * @typedef {{childscripts: {[child: string]: commandConfig}, childfolders: {[child: string]: folderConfig}} & commandConfig} folderConfig
 */
defaultenv.parseType(`commandConfig & {
    childscripts: {[child: string]: commandConfig},
    childfolders: {[child: string]: folderConfig}
}`, 'folderConfig');

const { getConfig } = require('../Config/GetConfig.js');
/**
 * @type {folderConfig}
 */
const config = getConfig('folderConfig', confPath, {
    "name": "commands",
    "fullname": "commands",
    "sortname": null,
    "img": null,
    "hidden": false,
    "disabled": false,
    "dependencies": [],
    "locked": false,
    "dependers": [],
    "errored": false,
    "childfolders": {
        "examples": {
            "name": "examples",
            "fullname": "commands/examples",
            "sortname": null,
            "img": null,
            "hidden": true,
            "disabled": true,
            "locked": true,
            "errored": false,
            "dependencies": [],
            "dependers": [],
            "parent": "commands",
            "childfolders": {},
            "childscripts": {}
        }
    },
    "childscripts": {}
});

/**
 * 
 * @param {string} path 
 * @returns 
 */
function getCMDObject(path) {
    const folders = path.split(sep);
    folders.shift();
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

const {create: subToCommandChanges, call: callHooks} = /**@type {import('../Hooks/HookHelper.js').HookHelper<(path: string, cmdObj: commandConfig) => void>} */ (simpleHookMgr());

/**
 * 
 * @param {commandConfig} cmdObj 
 * @param {Set<string>} cache 
 */
function updateLocked(cmdObj, cache=new Set()) {
    cmdObj.locked = cmdObj.disabled;
    //TODO: make this system lock other files aswell
}

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
            updateLocked(cmd);
        }
    }
    callHooks(path, cmd).filter(Boolean).forEach(console.error);
}

module.exports = {
    getCMDObject,
    changeCommandConfig,
    subToCommandChanges,
    config
}