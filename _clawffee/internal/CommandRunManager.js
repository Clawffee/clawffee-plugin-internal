//@ts-check
/*
 ┌───────────────────┐
 │                   │
 │     chokidar      │
 │                   │
 └─────────┬─────────┘
           │
           │ File updates
           │
 ┌─────────▼─────────┐
 │                   │
 │      FS.read      │
 │                   │
 └─────────┬─────────┘
           │
           │ Raw JS String
           │
 ┌─────────▼─────────┐        JS Sourcemap
 │                   │         & Metadata
 │   JS Prettifier   ├───────────────┐
 │                   │               │
 └─────────┬─────────┘     ┌─────────▼─────────┐
           │               │                   │
           │ Overriden JS  │ Original JS Cache │
           │               │                   │
 ┌─────────▼─────────┐     └─────▲─────┬───────┘
 │                   │           │     │
 │  Function() call  ├───────────┘     │
 │                   │       Metadata  │
 └─────────┬─────────┘                 │Function
           │                           │Metadata
           │ Potential Error           │
           │                           │
 ┌─────────▼─────────┐                 │
 │                   │                 │
 │ prepareStackTrace ◄─────────────────┘
 │                   │
 └───────────────────┘
*/

const fs = require('fs');
const { hookToFolder } = require('./FSHookManager');
const { join, sep, basename } = require('path')
const { commandFolders } = require('./CommandRunnerGlobals');

/**
 * @type {{[x: string]: Array<Function>}}
 */
globalThis.clawffeeInternals.fileCleanupFuncs = {}
/**
 * @type {{[x: string]: {
 * onLoad(path: string, str: string, initial: boolean): void, 
 * onUnload(path: string): void,
 * onRequire(path: string, str: string, initial: boolean): void,
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
 * @prop {string[]} dependencies
 * @prop {string[]} dependers
 * @prop {string?} parent
 * @prop {{[child: string]: commandConfig}} childfolders
 * @prop {{[child: string]: {[L in Exclude<keyof commandConfig, 'childfolders' | 'childscripts'>]: commandConfig[L]}}} childscripts
 */
/**
 * @type {commandConfig}
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
    "parent": null,
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

let workingDirectory = process.cwd();



/**
 * Loads the commands at a given path
 * @param {string} path 
 * @param {string} str 
 * @param {boolean} initial
 */
function loadCommand(path, str, initial) {
    console.log(`+ ${path}`);
    const fullPath = join(workingDirectory, path);
    try {
        for (const ending in globalThis.clawffeeInternals.fileManagers) {
            if (!Object.hasOwn(globalThis.clawffeeInternals.fileManagers, ending) || !path.endsWith(ending)) continue;
            const mgr = globalThis.clawffeeInternals.fileManagers[ending];
            try {
                (mgr.onLoad ?? mgr.onRequire)?.(fullPath, str, initial);
                break;
            } catch(e) {
                console.error(e);
            }
        }
    } catch(err) {
        console.error(err);
        unloadCommand(path);
    }
}


/**
 * 
 * @param {string} path 
 * @returns 
 */
function getCMDObject(path) {
    const folders = path.split(sep);
    let mgr = config;
    let prevname = folders.shift();
    let fname;
    while(folders.length > 1) {
        fname = folders.shift() ?? "";
        mgr = mgr.childfolders[fname] ??= {
            name: fname,
            fullname: folders.join('/'),
            sortname: null,
            img: null,
            parent: prevname ?? null,
            dependencies: [],
            dependers: [],
            hidden: false,
            disabled: false,
            childfolders: {},
            childscripts: {}
        };
        prevname = fname;
    }
    return mgr;
}
/**
 * Recursively loads and reloads commands in the given folder
 * @param {string} folder folder to load commands from
 */
function runCommands(folder) {
    if(!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
    }
    if(!fs.statSync(folder).isDirectory()) {
        fs.rmSync(folder);
        fs.mkdirSync(folder);
    }
    commandFolders.push(folder);
    hookToFolder(folder, (type, path, stats) => {
        const cmdobj = getCMDObject(path);
        if(type == 'unlink' || !stats) {
            delete cmdobj.childfolders[basename(path)];
            delete cmdobj.childscripts[basename(path)];
        } else {
            if(stats.isDirectory()) {
                if(!cmdobj.childfolders[basename(path)]) {
                    cmdobj.childfolders[basename(path)] = {
                        "name": basename(path),
                        "fullname": path,
                        "sortname": null,
                        "img": null,
                        "hidden": false,
                        "disabled": false,
                        "dependencies": [],
                        "dependers": [],
                        "parent": cmdobj.fullname,
                        childfolders: {},
                        childscripts: {}
                    }
                }
            } else {
                if(!cmdobj.childscripts[basename(path)]) {
                    cmdobj.childscripts[basename(path)] = {
                        "name": basename(path),
                        "fullname": path,
                        "sortname": null,
                        "img": null,
                        "hidden": false,
                        "disabled": false,
                        "dependencies": [],
                        "dependers": [],
                        "parent": cmdobj.fullname
                    }
                }
            }
        }
        if(!Object.keys(clawffeeInternals.fileManagers).find(v => path.endsWith(v))) {
            return;
        }
        if(type == 'unlink') {
            unloadCommand(path);
            return;
        }
        fs.readFile(path, (err, data) => {
            if(type != 'initial')
                unloadCommand(path);
            if(err) {
                console.warn(err);
                return;
            }
            loadCommand(path, data.toString(), type == 'initial');
        });
    });
}

module.exports = {
    runCommands,
    loadCommand,
    unloadCommand
}