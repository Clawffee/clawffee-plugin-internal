//@ts-check
const { join, basename } = require('path');
const { getCMDObject } = require('./CommandConfig');
const { simpleHookMgr } = require('../Hooks/HookHelper');

/**
 * @import {commandConfig} from "./CommandConfig"
 */

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
 * Unloads a commands at a given path
 * @param {string | commandConfig} cmdObj
 */
function unloadCommand(cmdObj) {
    if(typeof cmdObj == 'string') {
        cmdObj = getCMDObject(cmdObj).childscripts[basename(cmdObj)];
        if(!cmdObj) throw TypeError('There is no command defined at the given path!');
    }
    const path = cmdObj.fullname;
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
    callHooks(path, cmdObj, false).filter(Boolean).forEach(console.error);
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
    const fullPath = join(workingDirectory, path);
    try {
        for (const ending in globalThis.clawffeeInternals.fileManagers) {
            if (!Object.hasOwn(globalThis.clawffeeInternals.fileManagers, ending) || !path.endsWith(ending)) continue;
            const mgr = globalThis.clawffeeInternals.fileManagers[ending];
            const ret = (mgr.onLoad ?? mgr.onRequire)?.(fullPath, content, force, cmdObj);
            cmdObj.errored = false;
            callHooks(path, cmdObj, true).filter(Boolean).forEach(console.error);
            return ret;
        }
    } catch(err) {
        unloadCommand(path);
        cmdObj.errored = true;
        throw err;
    }
}

const {create: onChange, call: callHooks} = /**@type {import('../Hooks/HookHelper').HookHelper<(path: string, cmdObj: commandConfig, isLoad: boolean) => void>} */ (simpleHookMgr());

module.exports = {
    unloadCommand,
    loadCommand,
    onChange
}