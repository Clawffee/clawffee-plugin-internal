
module.exports = {
    unsafe: {
        commandConfig: globalThis.clawffeeInternals.commandConfig,
        /**
         * @type {{
         *  fileInfo: Map<string, fileInfo>,
         *  functionNames: Map<string, string>,
         *  functionFileNames: Map<string, string>,
         *  functionOverrides: Map<string, any>,
         *  requiredFiles: Map<string, Set<string>>,
         *  commandFolders: string[]
         * }}
         */
        commandGlobals: globalThis.clawffeeInternals.commandGlobals,
        fileManagers: globalThis.clawffeeInternals.fileManagers,
    },
    commandConfig: globalThis.clawffeeInternals.commandConfig,
    /**
     * @type {{
     *  fileInfo: Map<string, fileInfo>,
     *  functionNames: Map<string, string>,
     *  functionFileNames: Map<string, string>,
     *  functionOverrides: Map<string, any>,
     *  requiredFiles: Map<string, Set<string>>,
     *  commandFolders: string[]
     * }}
     */
    commandGlobals: globalThis.clawffeeInternals.commandGlobals,
    /**
     * 
     * @param {Error} error the error to use as the base of the stack trace
     * @param {any} stack the stack trace to apply on the error to use as the stack trace
     */
    prettyPrepareStack(error, stack) {
        return clawffeeInternals.prettyPrepareStack(error, stack);
    },
    fileManagers: globalThis.clawffeeInternals.fileManagers,
    addFileManager(extension, onRequire, onLoad, onUnload) {
        globalThis.clawffeeInternals.fileManagers[extension] = {
            onRequire,
            onLoad, 
            onUnload
        }
    },
    //TODO: comment all this again
    getPrefixStack() {
        return globalThis.clawffeeInternals.getPrefixStack();
    },
    setPrefixStack(stack) {
        globalThis.clawffeeInternals.setPrefixStack(stack);
    },
    getRunningScriptName() {
        return globalThis.clawffeeInternals.getRunningScriptName();
    },
    appendDefaultFile(fn) {
        if(typeof fn === 'function') {
            globalThis.clawffeeInternals.js.defaultFile
            globalThis.clawffeeInternals.js.defaultFile.push(fn);
        } else {
            globalThis.clawffeeInternals.js.defaultFile.push(() => fn);
        }
    },
    prefixDefaultFile(fn) {
        if(typeof fn === 'function') {
            globalThis.clawffeeInternals.js.defaultFile.unshift(fn);
        } else {
            globalThis.clawffeeInternals.js.defaultFile.unshift(() => fn);
        }
    },
    addFileCleanupFunc(filename, fn) {
        globalThis.clawffeeInternals.fileCleanupFuncs[filename]?.push(fn);
    },
    /**
     * Get the top-level directive of a function loaded by clawffee's module system.
     * This function will also return `null` if the given argument is not a function or not a function loaded by clawffee's module system.
     * 
     * For example:
     * 
     * ```
     * const example1 = () => {
     *     "strict";
     *     return true;
     * };
     * const example2 = () => true;
     * 
     * assert(getDirective(example1)).toBe("strict");
     * assert(getDirective(example2)).toBe(null);
     * ```
     *
     * @param {function} fn The function to get the directive from.
     * @returns {string | null} The top-level directive of the given function or `null` otherwise.
     */
    getDirective(fn) {
        if (typeof fn !== "function") {
            return null;
        }
        return globalThis.clawffeeInternals.commandGlobals.functionDirectives.get(fn.name) ?? null;
    }
}