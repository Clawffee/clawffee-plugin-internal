//@ts-check
const { functionNames, functionFileNames, functionOverrides, fileInfo } = clawffeeInternals.commandGlobals;

const acorn = require("acorn");
const acorn_walk = require("acorn-walk");
const { createSourceMap } = require("./SourceMaps/SourceMapSys");
const prettyPrepareStack = require('../clawffeeInternals').prettyPrepareStack;

// TODO add callback that callback in file got ran for GUI

/**
 * 
 * @param {string} codeStr 
 * @returns 
 */
function parseJS(codeStr) {
    return acorn.parse(codeStr, {
        ecmaVersion: "latest",
        sourceType: "module"
    });
}

/**
 * @returns {string} random character
 */
function randomChar() {
  const arr = "123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
  return arr[Math.trunc(Math.random() * arr.length)];
}

const allVariables = new Set();

/**
 * 
 * @param {string} filename 
 * @param {string} prefix 
 * @param {string | undefined} codeStr 
 */
function addVariable(filename, prefix, codeStr) {
    let iterstr = `___clawffee_katz_${prefix}_`;
    do {
        iterstr += randomChar();
    } while(codeStr?.includes(iterstr) || allVariables.has(iterstr));
    allVariables.add(iterstr);
    return iterstr;
}
/**
 * 
 * @param {string} filename 
 * @param {string} codeStr 
 * @param {import('acorn').Node} parsedCode 
 * @returns 
 */
function applyOverrides(filename, codeStr, parsedCode) {
    const sourceMap = createSourceMap(codeStr);
    /**
     * 
     * @param {import("acorn").WhileStatement |
     * import("acorn").DoWhileStatement |
     * import("acorn").ForStatement |
     * import("acorn").ForInStatement |
     * import("acorn").ForOfStatement} node 
     */
    function whileWrapper(node) {
        const iterstr = addVariable(filename, "while_protection", codeStr);
        sourceMap.insert(`let ${iterstr}=0;`, node.start);
        sourceMap.insert(`{if(${iterstr}++>0xFFFFFFF){throw Error("Discovered infinite loop!")}`, node.body.start);
        sourceMap.insert(`}`, node.body.end);
    }

    acorn_walk.simple(parsedCode, {
        WhileStatement: whileWrapper,
        DoWhileStatement: whileWrapper,
        ForStatement: whileWrapper,
        ForInStatement: whileWrapper,
        ForOfStatement: whileWrapper,
        FunctionDeclaration: (node, state) => {
            const funcstr = addVariable(filename, "function_name", codeStr);
            if(node.id) {
                sourceMap.insert(`let ${node.id.name} = globalThis.clawffeeInternals.addFunction(${JSON.stringify(filename)},`, node.start);
                sourceMap.insert(`${funcstr}_`, node.id.start);
                sourceMap.insert(`,"${node.id.name}")`, node.end);
            } else {
                const params = node.params.map(v => codeStr.substring(v.start, v.end)).join(', ');
                sourceMap.insert(`globalThis.clawffeeInternals.addFunction(${JSON.stringify(filename)},${node.async?"async ":""}function ${funcstr}(${params}) {(`, node.start);
                sourceMap.insert(`});`, node.body.start+1);
                sourceMap.insert(`)`, node.end);
            }
        },
        Property: (node, state) => {
            if(node.value.type != 'FunctionExpression') return;
            if(node.method) {
                sourceMap.insert(":", node.key.end);
                sourceMap.insert("=>", node.value.body.start);
            }
        },
        FunctionExpression: (node, state) => {
            const funcstr = addVariable(filename, "function_name", codeStr);
            const params = node.params.map(v => codeStr.substring(v.start, v.end)).join(', ');
            sourceMap.insert(`globalThis.clawffeeInternals.addFunction(${JSON.stringify(filename)},${node.async?"async ":""}function ${funcstr}(${params}) {(`, node.start);
            sourceMap.insert(`});`, node.body.start+1);
            sourceMap.insert(`)`, node.end);
        },
        ArrowFunctionExpression: (node, state) => {
            const funcstr = addVariable(filename, "function_name", codeStr);
            const params = node.params.map(v => codeStr.substring(v.start, v.end)).join(', ');
            sourceMap.insert(`globalThis.clawffeeInternals.addFunction(${JSON.stringify(filename)},${node.async?"async ":""}function ${funcstr}(${params}) {(`, node.start);
            sourceMap.insert(`});`, node.body.start+1);
            sourceMap.insert(`)`, node.end);
        },
    });
    return sourceMap.build();
}

/**
 * Add a function with overriden variables to use in the error log
 * @param {string} name fake file name to assign to the function
 * @param {Function} fn the function to have its data overriden
 * @param {string} fakename the name to use for function.name
 */
globalThis.clawffeeInternals.addFunction = (name, fn, fakename) => {
    /**
     * @type {string}
     */
    functionNames.set(fn.name, fakename);
    functionFileNames.set(fn.name, name);
    fileInfo.get(name)?.functions.add(fn.name);
    return fn;
}
/**
 * 
 * @param {string} filename 
 * @param {string} codeStr 
 * @returns 
 */
function wrapCode(filename, codeStr) {
    // syntax check
    try {
        const fn = new Function(codeStr);
    } catch(e) {
        if(e instanceof SyntaxError) {
            //@ts-ignore
            e.stack = [{
                getFileName: () => filename,
            //@ts-ignore
                getLineNumber: () => e.line-1,
            //@ts-ignore
                getColumnNumber: () => e.column,
                getFunctionName: () => "top_level",
                isToplevel: () => true
            }]
            if(e.message.includes("(")) {
                e.message = e.message.substring(0, e.message.lastIndexOf("("));
            }
            throw e;
        }
        throw e;
    }
    try {
        const parsedCode = parseJS(codeStr);
        // temporary error if import statements are used
        acorn_walk.simple(parsedCode, {
            ImportDeclaration: () => {
                throw new SyntaxError("Import statements are not yet supported in Clawffee scripts.");
            },
            ExportNamedDeclaration: () => {
                throw new SyntaxError("Export statements are not yet supported in Clawffee scripts.");
            },
            ExportDefaultDeclaration: () => {
                throw new SyntaxError("Export statements are not yet supported in Clawffee scripts.");
            },
            ExportAllDeclaration: () => {
                throw new SyntaxError("Export statements are not yet supported in Clawffee scripts.");
            }
        });
        const compiledCode = applyOverrides(filename, codeStr, parsedCode);
        const rootfuncstr = addVariable(filename, "function_name", codeStr);
        functionNames.set(rootfuncstr, "top_level");
        functionFileNames.set(rootfuncstr, filename);
        functionOverrides.set(filename, {
            getLineNumber(original, _) { return compiledCode.getPos(original.getColumnNumber()??0, (original.getLineNumber()??4) - 4).line + 1; },
            getColumnNumber(original, _) { return compiledCode.getPos(original.getColumnNumber()??0, (original.getLineNumber()??4) - 4).column; },
            isToplevel(__, _, fname) { return fname === rootfuncstr; }
        });
        fileInfo.set(filename, {
            variables: allVariables,
            functions: new Set([rootfuncstr])
        });
        acorn.parse(compiledCode.str, {
            ecmaVersion: 'latest',
            sourceType: "module",
        });
        /*
            require wrapper
            function (exports, require, module, __filename, __dirname) {}
            exports	A shorthand or alias for module.exports. Used to export values from a module.
            require	A function to import other modules (CommonJS-style).
            module	An object representing the current module, with properties like exports.
            __filename	The absolute path to the current module file.
            __dirname	The absolute path to the directory containing the current module file.
        */
        const fn = Function("", `function ${rootfuncstr}(exports, require, module, __fileName, __dirname){\n${compiledCode.str}\n} return ${rootfuncstr}`)();
        return fn;
    } catch(e) {
        if(e instanceof SyntaxError) {
            e.stack = [{
                getFileName: () => filename,
                getLineNumber: () => e.loc.line - 5,
                getColumnNumber: () => e.loc.column,
                getFunctionName: () => "top_level",
                isToplevel: () => true
            }]
            if(e.message.includes("(")) {
                e.message = e.message.substring(0, e.message.lastIndexOf("("));
            }
            console.error(prettyPrepareStack(e, e.stack));
        } else {
            console.error(e);
        }
        return null;
    }
    console.error("Encountered internal error!");
    return null;
}


module.exports = {
    parseJS,
    applyOverrides,
    wrapCode,
    functionNames,
    functionFileNames,
    functionOverrides,
    fileInfo
};