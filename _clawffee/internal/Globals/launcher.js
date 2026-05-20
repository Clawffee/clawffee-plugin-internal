//@ts-check
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef updateInfo
 * @prop {any} info
 * @prop {any} update_data
}
 */
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef metaInfo
 * @prop {string} version
 */
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef InternalData
 * @prop {Promise<updateInfo | string>} updateInfo
 * @prop {(folder: string, pubKey: string) => boolean} verifyHash
 * @prop {() => Promise<string?>} runUpdate
 * @prop {string} pubKey
 * @prop {(encHash: Buffer<ArrayBuffer>, pubKey: string) => string?} getPubHash
 * @prop {metaInfo} meta
 */
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef EnvironmentV1
 * @prop {string}                 path
 * @prop {string[]}               args
 * @prop {number}                 logLevel
 * @prop {Record<string, number>} logLevels
 * @prop {InternalData}           internalData
 */
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef PluginV1
 * @property {() => Promise<void>} launch
 * @property {(format: "human" | "text" | "json") => Promise<string>} version
 */
/**
 * If you want to add data, it has to be optional.
 *
 * @typedef ModuleV1
 * @property {(env: EnvironmentV1) => Promise<PluginV1>} loadPlugin
 */
/**
 * @type {InternalData}
 */
module.exports = {
    ...globalThis.clawffeeInternals.launcher
}
