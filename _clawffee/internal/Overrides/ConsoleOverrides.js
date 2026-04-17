//@ts-check
const { prettyPrepareStack } = require('./ErrorOverrides');
const util = require('util');

const {basename, sep } = require('path');

/**
 * @type {{[key: string]: {func: (name: string, cleanedData: string, log: string, ...args: any) => void, readonly key: string, remove: () => void}}}
 */
const consoleHooks = {};

/**
 * 
 * @param {any[]} data 
 * @param {string} prefix 
 * @returns 
 */
function cleanData(data, prefix) {
    let str = "";
    data.forEach(v => {
        str += " " + prefix;
        switch(typeof v) {
            case 'string':
                str += v;
                break;
            case 'object':
                if(v instanceof Error) {
                    try {
                        const oldPrepareStack = Error.prepareStackTrace;
                        let preparedStack = false;
                        Error.prepareStackTrace = (err, stack) => {
                            preparedStack = true;
                            return prettyPrepareStack(err, stack);
                        }
                        let stack = v.stack;
                        if(!preparedStack) {
                            stack = prettyPrepareStack(v, stack ?? "") ?? undefined;
                        }
                        if(!stack) {
                            Error.captureStackTrace(v, cleanData.caller);
                            stack = v.stack + "\nlog Stack not error stack!";
                        }
                        Error.prepareStackTrace = oldPrepareStack;
                        str += stack;
                    } catch(e) {
                        //@ts-ignore
                        str += `${v.constructor.name}: ${v.message}\n    at <unable to get stack trace> reason:` + e.stack;
                    }
                    break;
                }
            default:
                str += Bun.inspect(v, { colors: true, depth: 2 }).replaceAll('\u001b[0m', '\u001b[0m' + prefix);
                break;
        }
    });
    str = str.substring(1);
    return str;
}

const fs = require('fs');
const logFile = fs.createWriteStream('log.txt');
let ownPrefix = process.cwd().trim().length + 1;
let longestName = 30;
let longestLongName = 42;
/**
 * 
 * @param {string} name 
 * @param {(...values: any) => void} copy 
 * @param {string} prefix 
 * @param {boolean | number} skipcalls 
 * @returns {(...data: any) => void}
 */
function wrapConsoleFunction(name, copy, prefix = "", skipcalls = false) {
    return (...data) => {
        /**
         * @type {(NodeJS.CallSite & {Overriden: boolean, FileName: string, LineNumber: number, ColumnNumber: number})[]}
         */
        //@ts-expect-error
        const callSites = util.getCallSites(10, {
            sourceMap: true
        //@ts-ignore
        }).filter(v => v.FileName ?? null);
        // if skiplines is true, first element is number of function calls to skip
        if(skipcalls) {
            callSites.splice(0, data[0]);
            data = data.slice(1);
        }
        callSites.splice(0, 1);
        let renderedText = "@system";
        let fullname = "@system";
        let smallname = "@system";
        if(callSites[0]) {
            let firstOverride = callSites.findIndex(v => v.Overriden);
            if(firstOverride != -1) {
                smallname = `${callSites[firstOverride].FileName.substring(ownPrefix + 9)}:${callSites[firstOverride].LineNumber}:${callSites[firstOverride].ColumnNumber}`;
                fullname = smallname;
            } else if(callSites[0].FileName[0] == "[") {
                smallname = `${callSites[0].FileName}`;
                fullname = smallname;
            } else {
                smallname = "@internal";
                fullname = "@internal";
                if(callSites[0].FileName.includes("node_modules")) {
                    let startIndex = Math.max(
                        callSites[0].FileName.lastIndexOf("node_modules"),
                    ) + 15;
                    let endIndex = callSites[0].FileName.indexOf(sep, startIndex);
                    smallname = `#${callSites[0].FileName.substring(startIndex, endIndex)} ${basename(callSites[0].FileName)}`;
                    fullname = smallname;
                } else if(callSites[0].FileName != Bun.main) {
                    let endIndex = callSites[0].FileName.indexOf(sep, ownPrefix + 8);
                    smallname = `\u001b[2m@${callSites[0].FileName.substring(ownPrefix + 8, endIndex)}`;
                    fullname = `@${callSites[0].FileName.substring(ownPrefix + 8, endIndex)} ${basename(callSites[0].FileName)}`;
                }
                smallname += `:${callSites[0].LineNumber}:${callSites[0].ColumnNumber}`;
                fullname += `:${callSites[0].LineNumber}:${callSites[0].ColumnNumber}`;
            }
        }
        longestName = Math.max(longestName, Bun.stripANSI(smallname).length + 2);
        longestLongName = Math.max(longestLongName, Bun.stripANSI(fullname).length + 2);
        const cleaneddata = cleanData(data, prefix);

        logFile.write(Bun.stripANSI(
            new Date().toISOString().padEnd(longestLongName, " ")
            + "╶╶┝╸" 
            + '\n'
            + fullname.padEnd(longestLongName, " ")
            + "  ╎ " 
            + cleaneddata
                .split("\n")
                .reduce((p, v) => p + "\n".padEnd(longestLongName, " ") + "   ╎ " + v))
            + '\n'
        );
        const logTxt = 
            prefix 
            + smallname
            + "".padEnd(longestName - Bun.stripANSI(smallname).length, " ") 
            + "╶╶\u001b[0m┝╸" 
            + prefix 
            + cleaneddata
                .split("\n")
                .reduce((p, v) => p + "\n".padEnd(longestName, " ") + "   ╎ " + v);
        copy(logTxt);
        Object.values(consoleHooks).forEach(v => {
            try {
                v.func(name, cleaneddata, logTxt, ...data);
            } catch(e) {
                logFile.write(String(e));
                copy(String(e));
            }
        });
    }
}

const olddebug = console.debug;
const oldlog = console.log;
const oldinfo = console.info;
const oldwarn = console.warn;
const olderr = console.error;

// Expose a version of console that skips internal calls
module.exports = {
    log: wrapConsoleFunction("log", oldlog, "\u001b[0m", true),
    info: wrapConsoleFunction("info", oldinfo, "\u001b[96m", true),
    warn: wrapConsoleFunction("warn", oldwarn, "\u001b[93m", true),
    error: wrapConsoleFunction("error", olderr, "\u001b[91m", true),
    debug: wrapConsoleFunction("debug", olddebug, "\u001b[90m", true),
    /**
     * 
     * @param {(name: string, cleanedData: string, log: string, ...args: any) => void} func 
     */
    addHook(func) {
        if(typeof func != 'function') throw Error('Func is not a function');
        const key = Bun.randomUUIDv7();
        return consoleHooks[key] = {
            func: func,
            get key() {return key},
            remove() { delete consoleHooks[key] },
        }
    },
    /**
     * 
     * @param {string} key 
     */
    removeHook(key) {
        delete consoleHooks[key];
    },
    bind() {
        console.debug = wrapConsoleFunction("debug", olddebug, "\u001b[90m");
        console.log = wrapConsoleFunction("log", oldlog, "\u001b[0m");
        console.info = wrapConsoleFunction("info", oldinfo, "\u001b[96m");
        console.warn = wrapConsoleFunction("warn", oldwarn, "\u001b[93m");
        console.error = wrapConsoleFunction("error", olderr, "\u001b[91m");
    }
};
