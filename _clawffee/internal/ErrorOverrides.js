//@ts-check
const { functionNames, functionFileNames, functionOverrides, fileInfo } = require('./CommandRunnerGlobals');
const util = require('util');
const fs = require('fs');
const acorn = require("acorn");
const acorn_walk = require("acorn-walk");

/**
 * 
 * @returns {NodeJS.CallSite[]}
 */
globalThis.clawffeeInternals.getPrefixStack = () => {
    const oldPrepareStack = Error.prepareStackTrace;
    Error.prepareStackTrace = (err, stack) => {
        return stack;
    }
    const st = {};
    Error.captureStackTrace(st, globalThis.clawffeeInternals.getPrefixStack);
    //@ts-ignore
    const stack = st.stack;
    Error.prepareStackTrace = oldPrepareStack;
    return stack;
}
/**
 * @type {NodeJS.CallSite[]}
 */
let prefixStack = [];
/**
 * 
 * @param {NodeJS.CallSite[]} stack 
 */
globalThis.clawffeeInternals.setPrefixStack = (stack = []) => {
    prefixStack = stack;
}

/**
 * 
 * @param {NodeJS.CallSite & {Overriden: boolean}} v 
 * @returns 
 */
function overrideStack(v) {
    if(v.Overriden) return true;
    let f = v.getFunctionName() ?? "";
    const fileName = functionFileNames.get(f);
    if(!fileName) return false;
    v.getFunctionName = () => functionNames.get(f) ?? null;
    v.getScriptNameOrSourceURL = () => functionNames.get(f) ?? null;
    v.getFileName = () => fileName;
    v.Overriden = true;
    const overrides = functionOverrides.get(fileName);
    if(!overrides) return true;
    const original = {};
    Object.entries(overrides).forEach(([key, value]) => {
        if(!value) return;
        //@ts-ignore
        var val = v[key];
        //@ts-ignore
        original[key] = val;
        //@ts-ignore
        v[key] = value.bind(v, new Proxy({}, {
            get(t, p, r) {
                //@ts-ignore
                return original[p].bind(v) ?? v[p];
            }
        }), val, f);
    });
    return true;
}

util.getCallSites = () => {
    const oldPrepareStack = Error.prepareStackTrace;
    Error.prepareStackTrace = (err, stack) => {
        stack = stack.concat(prefixStack);
        return stack.map((v) => {
            //@ts-ignore
            let override = overrideStack(v);
            return {
                this: v.getThis(), // always undefined
                function: v.getFunction(), // always undefined
                functionName: v.getFunctionName(), // "" instead of null
                LineNumber: v.getLineNumber(),
                ColumnNumber: v.getColumnNumber(),
                EvalOrigin: v.getEvalOrigin(), // undefined
                FileName: v.getFileName(),
                MethodName: v.getMethodName(), // "" instead of null
                PromiseIndex: v.getPromiseIndex(),
                ScriptNameOrSourceURL: v.getScriptNameOrSourceURL(),
                TypeName: v.getTypeName(), // "undefined" instead of null
                Async: v.isAsync(), // always false
                Constructor: v.isConstructor(),
                Eval: v.isEval(),
                PromiseAll: v.isPromiseAll(),
                Native: v.isNative(),
                Toplevel: v.isToplevel(), // always true??
                Overriden: override
                // console.log(v.getEnclosingColumnNumber()); NOT SUPPORTED
                // console.log(v.getEnclosingLineNumber()); NOT SUPPORTED
                // console.log(v.getScriptHash()); NOT SUPPORTED
                // console.log(v.getPosition()); NOT SUPPORTED
            }
        });
    }
    const err = {};
    let stack = "";
    Error.captureStackTrace(err, util.getCallSites);
    //@ts-ignore
    stack = err.stack;
    Error.prepareStackTrace = oldPrepareStack;
    if(typeof stack != 'object') return [];
    return stack;
}

/**
 * 
 * @param {Function?} fn 
 * @returns 
 */
globalThis.clawffeeInternals.getRunningScriptName = (fn=null) => {
    const oldPrepareStack = Error.prepareStackTrace;
    Error.prepareStackTrace = (err, stack) => {
        stack = stack.concat(prefixStack);
        for(let x of stack) {
            //@ts-ignore
            if(overrideStack(x)) {
                return x.getFileName();
            }
        }
        return null;
    }
    const st = {};
    Error.captureStackTrace(st, fn ?? globalThis.clawffeeInternals.getRunningScriptName);
    //@ts-ignore
    const stack = st.stack;
    Error.prepareStackTrace = oldPrepareStack;
    return stack;
}

const keyWordRegex = new RegExp("\\b(?:" + [
    "abstract", "arguments", "async", "await", 
    "boolean", "break", "byte", "case",
    "catch", "char", "class", "const",
    "continue", "debugger", "default", "delete",
    "do", "double", "else", "enum",
    "eval", "export", "extends", "false",
    "final", "finally", "float", "for",
    "function", "goto", "if", "implements",
    "function", "import", "in", "instanceof",
    "int", "interface", "let", "long",
    "native", "new", "null", "package",
    "private", "protected", "public", "return",
    "short", "static", "super", "switch",
    "synchronized", "this", "throw", "throws",
    "transient", "true", "try", "typeof",
    "using", "var", "void", "volatile",
    "while", "with", "yield"
].reduce((p, v) => p + "|" + v) + ")\\b", 'gi');

/**
 * 
 * @param {NodeJS.CallSite} s 
 * @param {string} content 
 * @param {number[]} linePos 
 * @param {{[x: string]: {
 *  s: number,
 *  e: number,
 *  v: string
 * }[]}} notations 
 * @returns 
 */
function beautifyCode(s, content, linePos, notations) {
    const line = s.getLineNumber() ?? 0;
    /**
     * @type {string[]}
     */
    const lines = [];
    const column = s.getColumnNumber() ?? 0;
    let offset = 0xFFFFFFFFFF;
    let errStr = "";
    for(let i = Math.max(1,line-4); i <= Math.min(linePos.length - 1, line+2); i++) {
        /**
         * @type {string}
         */
        const line = content.substring(linePos[i-1] ?? 0, linePos[i]-1);
        lines.push(line);
        if(line.trim().length) {
            offset = Math.min(offset,line.length - line.trimStart().length);
        }
    }
    if(column - offset > 32) {
        offset = column - 32;
    }

    /**
     * 
     * @param {number} i 
     * @returns 
     */
    function getPrettyLine(i) {
        /**
         * @type {string}
         */
        let codeLine = lines.shift()?.substring(offset, offset + 64) ?? "";
        if(codeLine.length == 64) {
            codeLine = codeLine.substring(0,61) + "...";
        }
        (notations[""+(i-1)] ?? []).sort((a,b) => b.s-a.s).forEach(v => {
            codeLine = codeLine.substring(0, v.s-offset) + v.v + codeLine.substring(v.s-offset,v.e-offset) + "\u001b[0m" + codeLine.substring(v.e-offset);
        });

        const positions = [...codeLine.matchAll(keyWordRegex)].map(a => {return {index: a.index, length: a[0].length}});
        positions.reverse().forEach(p => {
            const lastIndex = codeLine.lastIndexOf("\u001b[", p.index);
            if(lastIndex != -1 && codeLine[lastIndex + 2] != '0') return;
            codeLine = codeLine.substring(0,p.index) + "\u001b[95m" + codeLine.substring(p.index,p.index + p.length) + "\u001b[0m" + codeLine.substring(p.index + p.length);
        });
        return `\u001b[${i.toString().length + 3}D\u001b[0m` + i.toString() + " │ " + codeLine + "\n";
    }

    for(let i = Math.max(1,line-4); i <= Math.max(1,line); i++) {
        errStr += getPrettyLine(i);
    }
    errStr += `\u001b[4D\u001b[90m» \u001b[0m│ ` + " ".repeat(Math.max(0,column-offset)) + "\u001b[91m▲\u001b[0m\n";

    for(let i = Math.max(1,line)+1; lines.length; i++) {
        errStr += getPrettyLine(i);
    }
    return errStr;
}

/**
 * 
 * @param {Error} err 
 * @param {NodeJS.CallSite[]} stack 
 * @returns 
 */
Error.prepareStackTrace = (err, stack) => {
    stack.forEach(v => {
        //@ts-ignore
        overrideStack(v)
    });
    return err.constructor.name + ": " + err.message + "\n    at " + stack.map(v => {
        return `${v.getFunctionName() || "<anonymous>"} (${v.getFileName()}:${v.getLineNumber()}:${v.getColumnNumber()})`;
    }).join("\n    at ");
};

/**
 * 
 * @param {Error} err 
 * @param {NodeJS.CallSite[] | string} stack 
 * @returns 
 */
function prettyPrepareStack(err, stack) {
    /**
     * @type {NodeJS.CallSite | undefined}
     */
    let s = undefined;
    let name;
    if(!stack) {
        return null;
    }
    if(typeof stack == 'string') {
        if(stack.startsWith('\u001b[')) {
            return stack;
        }
        // get the file name from the string
        const lines = stack.split("\n");
        stack = [];
        for(let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^\s*at (.*) \(((.*):(\d+):(\d+)|(.*))\)/);
            if(match) {
                //@ts-expect-error
                stack.push({
                    getFunctionName: () => match[1],
                    getFileName: () => match[3],
                    getLineNumber: () => parseInt(match[4] ?? "0"),
                    getColumnNumber: () => parseInt(match[5] ?? "0"),
                    isToplevel: () => false
                });
            }
        }
    }

    stack = stack.concat(prefixStack);
    stack.forEach(v => {
        //@ts-ignore
        if(overrideStack(v))
            s = s ?? v;
    });
    s = s ?? stack[0];
    if(!s) {
        return null;
    }
    name = s.getFileName() ?? "";
    //@ts-ignore
    err.line = s.getLineNumber() ?? 0;
    //@ts-ignore
    err.fileName = name;
    //@ts-ignore
    err.column = s.getColumnNumber() ?? 0;
    let errStr = `\u001b[91;1m${err.constructor.name}\u001b[0m: ${err.message}\n\u001b[2D\u001b[0m│\n`;
    if(fs.existsSync(name) && fs.statSync(name).isFile()) {
        const content = fs.readFileSync(name).toString();
        const linePos = [{index: -1}, ...content.matchAll(new RegExp('\n', 'gi')), {index: content.length}, {index: content.length}].map(a => a.index + 1);
        /**
         * @type {{
         *  s: number,
         *  e: number,
         *  v: string
         * }[]}
         */
        const notations = [];
        try {
            const parsedCode = acorn.parse(content, {
                ecmaVersion: 'latest',
                sourceType: "module",
                onComment: (a,b,c,d) => {
                    notations.push({
                        s: c, e: d, v: "\u001b[90m"
                    });
                }
            });
            acorn_walk.simple(parsedCode, {
                Literal: (node, state) => {
                    const obj = {
                        s: node.start, e: node.end, v: ""
                    }
                    switch (typeof node.value) {
                        case 'string': obj.v = "\u001b[92m"; break;
                        case 'boolean': obj.v = "\u001b[93m"; break;
                        case 'number': obj.v = "\u001b[93m"; break;
                        case 'bigint': obj.v = "\u001b[93m"; break;
                        case 'undefined': obj.v = "\u001b[90m"; break;
                        case 'object': obj.v = "\u001b[94m"; break;
                    }
                    notations.push(obj);
                },
                CallExpression: (node, state) => {
                    //@ts-expect-error
                    if(node.callee.property) {
                        notations.push({
                            //@ts-expect-error
                            s: node.callee.property.start, e: node.callee.property.end, v: "\u001b[96m"
                        });
                        return;
                    }
                    notations.push({
                        s: node.callee.start, e: node.callee.end, v: "\u001b[96m"
                    });
                },
                NewExpression: (node, state) => {
                    notations.push({
                        s: node.callee.start, e: node.callee.end, v: "\u001b[96m"
                    });
                }
            });
        } catch(e) {
        }
        /**
         * @type {{[x: string | number]: {
         *  s: number,
         *  e: number,
         *  l: number,
         *  v: string
         * }[]}}
         */
        const cn = {};
        let previousLine = linePos.length-1;
        notations.sort((a,b) => b.s-a.s).forEach((v) => {
            while(v.s <= linePos[previousLine]) previousLine--;
            cn[previousLine] = cn[previousLine] ?? [];
            cn[previousLine].push({
                v: v.v, l: previousLine,
                s: v.s - linePos[previousLine],
                e: Math.min(v.e, linePos[previousLine+1]) - linePos[previousLine]
            });
            let nextLine = previousLine+1;
            while(v.e > linePos[nextLine]) {
                cn[nextLine] = cn[nextLine] ?? [];
                cn[nextLine].push({
                    v: v.v, l: nextLine,
                    s: 0,
                    e: Math.min(v.e, linePos[nextLine+1]) - linePos[nextLine]
                });
                nextLine++;
            }
        });
        errStr += beautifyCode(s, content, linePos, cn);
    }
    let start = stack.findIndex(i => i == s);
    if(start == -1) start = 0;
    let totalSlices = 5 + start;
    for(let x = 0; x < totalSlices; x++) {
        if(!stack[x]) break;
        if(stack[x+1]?.isToplevel() && stack[x+1]?.getFileName()?.startsWith('[')) {
            stack.splice(x+1, 1);
            stack[x].isToplevel = () => true;
        }
        errStr += `\n    \u001b[90mat ${
            stack[x].isToplevel()?"\u001b[0;94;1;3mtop level":stack[x].getFunctionName()?.length?`\u001b[0;1;3m${stack[x].getFunctionName()}`:"\u001b[90m<anonymous>"
            } \u001b[0;90m(${stack[x].getFileName()?.length?`\u001b[96m${stack[x].getFileName()}`:"\u001b[0minternal"}\u001b[90m:\u001b[93m${stack[x].getLineNumber()}\u001b[90m:\u001b[93m${stack[x].getColumnNumber()}\u001b[90m)\u001b[0m`;
        if(stack[x].getFileName()?.includes('node_modules')) {
            totalSlices++;
        }
    }
    return errStr;
}
globalThis.clawffeeInternals.prettyPrepareStack = prettyPrepareStack;

module.exports = {
    prettyPrepareStack
};