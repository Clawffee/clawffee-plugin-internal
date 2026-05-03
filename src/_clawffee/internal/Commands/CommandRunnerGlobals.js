//@ts-check
/**
 * @typedef fileInfo
 * @prop {Set<string>} variables
 * @prop {Set<string>} functions
 */
module.exports = {
    /**
     * @type {Map<string, fileInfo>}
     */
    fileInfo: new Map(),
    /**
     * @type {Map<string, string>}
     */
    functionNames: new Map(),
    /**
     * @type {Map<string, string>}
     */
    functionFileNames: new Map(),
    /**
     * @typedef {(
     *  v: NodeJS.CallSite, 
     *  value: NodeJS.CallSite[T], 
     *  string) => ReturnType<NodeJS.CallSite[T]>} stackOverride
     * @template {keyof NodeJS.CallSite} T
     */
    /**
     * @type {Map<string, {[key in keyof NodeJS.CallSite]?: stackOverride<key>}>}
     */
    functionOverrides: new Map(),
    /**
     * The top-level directive of a given function name.
     *
     * @type {Map<string, string>}
     */
    functionDirectives: new Map(),
    /**
     * @type {Map<string, Set<string>>}
     */
    requiredFiles: new Map(),
    /**
     * @type {string[]}
     */
    commandFolders: []
}