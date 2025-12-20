
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
        clawffeeInternals.prettyPrepareStack(error, stack);
    },
    fileManagers: globalThis.clawffeeInternals.fileManagers,
    addFileManager(extension, onRequire) {
        globalThis.clawffeeInternals.fileManagers[extension] = {
            onRequire
        }
    },
    getPrefixStack() {
        globalThis.clawffeeInternals.getPrefixStack();
    },
    setPrefixStack(stack) {
        globalThis.clawffeeInternals.setPrefixStack(stack);
    },
    getRunningScriptName() {
        return globalThis.clawffeeInternals.getRunningScriptName();
    },
    appendDefaultFile(fn) {
        if(typeof fn === 'function') {
            globalThis.clawffeeInternals.js.defaultFile.push(fn)
        } else {
            globalThis.clawffeeInternals.js.defaultFile.unshift(() => fn);
        }
    },
    prefixDefaultFile(fn) {
        if(typeof fn === 'function') {
            globalThis.clawffeeInternals.js.defaultFile.unshift(fn)
        } else {
            globalThis.clawffeeInternals.js.defaultFile.unshift(() => fn);
        }
    },
    addFileCleanupFunc(filename, fn) {
        globalThis.clawffeeInternals.fileCleanupFuncs[filename]?.push(fn);
    }

}