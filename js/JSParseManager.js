//@ts-check
const { functionNames, functionFileNames, functionOverrides, functionDirectives, fileInfo } = require('#globals').commandGlobals;
const verbose = require('#globals')

const acorn = require("acorn");
const acorn_walk = require("acorn-walk");
const { createSourceMap } = require("./SourceMaps/SourceMapSys");
const prettyPrepareStack = require('../clawffeeInternals').prettyPrepareStack;

// TODO add callback that callback in file got ran for GUI

/**
 * Load the syntax tree of a javascript module.
 * 
 * @param {string} codeStr The source code of the javascript module as a string.
 * @returns {import('acorn').Program} The `acorn` node.
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
 * Get the top-level directive from function nodes like `FunctionDeclaration`, `FunctionExpression`, or `ArrowFunctionExpression`.
 * @param {import('acorn').Function} node The function node.
 * @returns {string | undefined} The top-level directive from the function node.
 */
function findDirective(node) {
    if (node.body.type !== "BlockStatement") {
        return;
    }
    if (node.body.body.length <= 0) {
        return;
    }
    if (node.body.body[0].type !== "ExpressionStatement") {
        return;
    }
    if (typeof node.body.body[0].directive !== "string") {
        return;
    }
    return node.body.body[0].directive;
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
     * @param {import("acorn").Node & { body: import("acorn").Statement }} node 
     */
    function whileWrapper(node) {
        const iterstr = addVariable(filename, "while_protection", codeStr);
        sourceMap.insert(`let ${iterstr}=0;`, node.start);
        sourceMap.insert(`{if(${iterstr}++>0xFFFFFFF){throw Error("Discovered infinite loop!")}`, node.body.start);
        sourceMap.insert(`}`, node.body.end);
    }

    /**
     * @param {import('acorn').Function} node Any function.
     */
    function funtionWrapper(node) {
        const funcstr = addVariable(filename, "function_name", codeStr);
        const directive = findDirective(node);
        const options = {
            fakename: node?.id?.name,
            directive,
        };
        const addFunctionStart = `globalThis.clawffeeInternals.addFunction(${JSON.stringify(filename)},`;
        const addFunctionEnd = `${node.body.type != 'BlockStatement' ? "}" : ""},${JSON.stringify(options)})`;
        if(node.id) {
            sourceMap.insert(`let ${node.id.name}=${addFunctionStart}`, node.start);
            sourceMap.insert(`${funcstr}_`, node.id.start);
        } else {
            const argumentsStart = `${node.async ? "async " : ""}function ${funcstr}(`;
            const argumentsEnd = `)${node.body.type != 'BlockStatement' ? "{return " : ""}`;
            if(node.params.length > 0) {
                sourceMap.replace(`${addFunctionStart}${argumentsStart}`, node.params[0].start - node.start, node.start);
                sourceMap.replace(`${argumentsEnd}`, node.body.start - node.params[node.params.length-1].end - 1, node.params[node.params.length-1].end);
            } else {
                sourceMap.replace(`${addFunctionStart}${argumentsStart}${argumentsEnd}`, node.body.start - node.start - 1, node.start);
            }
        }
        sourceMap.insert(`${addFunctionEnd}`, node.end);
    }

    /**
     * @param {import('acorn').Property | import("acorn").AssignmentProperty} node 
     */
    function propertyWrapper(node) {
        if(node.value.type != 'FunctionExpression') return;
        if(node.method) {
            sourceMap.insert(":", node.key.end);
        }
    }

    acorn_walk.simple(parsedCode, {
        WhileStatement: whileWrapper,
        DoWhileStatement: whileWrapper,
        ForStatement: whileWrapper,
        ForInStatement: whileWrapper,
        ForOfStatement: whileWrapper,
        FunctionDeclaration: funtionWrapper,
        Property: propertyWrapper,
        FunctionExpression: funtionWrapper,
        ArrowFunctionExpression: funtionWrapper,
    });
    return sourceMap.build();
}

/**
 * @typedef addFunctionOptions
 * @prop {string} fakename? the name to use for function.name
 * @prop {string} directive? the top-level directive of the function
 */

/**
 * Add a function with overriden variables to use in the error log or to access function directives.
 * 
 * @param {string} name fake file name to assign to the function
 * @param {Function} fn the function to have its data overriden
 * @param {addFunctionOptions} options? optional options
 */
//@ts-ignore
globalThis.clawffeeInternals.addFunction = (name, fn, options) => {
    if(typeof fn == 'object') {
        fn = Object.values(fn)[0];
    }
    /**
     * @type {string}
     */
    if (options?.fakename != null) {
        functionNames.set(fn.name, options.fakename);
    }
    if (options?.directive != null) {
        functionDirectives.set(fn.name, options.directive);
    }
    functionFileNames.set(fn.name, name);
    fileInfo.get(name)?.functions?.add(fn.name);
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
        const parsedCode = parseJS(codeStr);
        function throwErr(msg, char) {
            const err = new SyntaxError(msg);
            err.loc = createSourceMap(codeStr).build().getPos(char);
            err.loc.line += 1;
            throw err;
        }
        // temporary error if import statements are used
        acorn_walk.simple(parsedCode, {
            ImportDeclaration: (node) => {
                throwErr("Import statements are not yet supported in Clawffee scripts.", node.start);
            },
            ExportNamedDeclaration: (node) => {
                throwErr("Export statements are not yet supported in Clawffee scripts.", node.start);
            },
            ExportDefaultDeclaration: (node) => {
                throwErr("Export statements are not yet supported in Clawffee scripts.", node.start);
            },
            ExportAllDeclaration: (node) => {
                throwErr("Export statements are not yet supported in Clawffee scripts.", node.start);
            },
            DebuggerStatement: (node) => {
                throwErr("debugger statements are not yet supported in Clawffee scripts.", node.start);
            }
        });
        const compiledCode = applyOverrides(filename, codeStr, parsedCode);
        if(globalThis.clawffeeInternals.verbose) {
            console.log(compiledCode.str);
        }
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
                getLineNumber: () => e.loc.line,
                getColumnNumber: () => e.loc.column,
                getFunctionName: () => "top_level",
                isToplevel: () => true
            }];
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
    functionDirectives,
    fileInfo
};