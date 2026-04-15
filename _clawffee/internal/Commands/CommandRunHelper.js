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
const { basename } = require('path');
const { commandFolders } = require('./CommandRunnerGlobals');
const { unloadCommand, loadCommand, onChange } = require('./CommandRunner');
const { getCMDObject, subToCommandChanges } = require('./CommandConfig');

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
                        name: basename(path),
                        fullname: path,
                        sortname: null,
                        img: null,
                        hidden: false,
                        disabled: false,
                        locked: cmdobj.locked,
                        errored: false,
                        dependencies: [],
                        dependers: [],
                        parent: cmdobj.fullname,
                        childfolders: {},
                        childscripts: {}
                    }
                }
            } else {
                if(!cmdobj.childscripts[basename(path)]) {
                    cmdobj.childscripts[basename(path)] = {
                        name: basename(path),
                        fullname: path,
                        sortname: null,
                        img: null,
                        hidden: false,
                        disabled: false,
                        locked: cmdobj.locked,
                        errored: false,
                        parent: cmdobj.fullname,
                        dependencies: [],
                        dependers: []
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
            if(err) {
                console.warn(err);
                return;
            }
            if(type != 'initial')
                unloadCommand(path);
            loadCommand(cmdobj.childscripts[basename(path)], data.toString(), type != 'initial');
        });
    });
}

/**
 * @type {Set<string>}
 */
const loadedCommands = new Set();

subToCommandChanges((path, CMD) => {
    if(CMD.disabled == loadedCommands.has(path)) {
        if(CMD.disabled) {
            unloadCommand(CMD)
        } else {
            loadCommand(CMD, fs.readFileSync(CMD.fullname).toString(), false)
        }
    }
})

onChange((path, cmdObj, isLoad) => {
    if(isLoad) {
        if(loadedCommands.has(path)) {
            console.log(`⮔ ${path}`);
        } else {
            console.log(`+ ${path}`);
        }
        loadedCommands.add(path);
    } else {
        console.log(`- ${path}`);
        loadedCommands.delete(path);
    }
}) 

module.exports = {
    runCommands,
    loadCommand,
    unloadCommand,
    subToCommandChanges,
    onCommandLoad: onChange
}