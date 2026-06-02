//@ts-check
/**
 * @typedef updateInfo
 * @prop {any} info
 * @prop {any} update_data
}
 */
/**
 * @typedef metaInfo
 * @prop {string} version
 */
/**
 * @typedef InternalData
 * @prop {Promise<updateInfo | string>} updateInfo
 * @prop {(folder: string, pubKey: string) => boolean} verifyHash
 * @prop {() => Promise<string?>} runUpdate
 * @prop {string} pubKey
 * @prop {(encHash: Buffer<ArrayBuffer>, pubKey: string) => string?} getPubHash
 * @prop {metaInfo} meta
 * @prop {import('isomorphic-git')} git
 * @prop {import('isomorphic-git/http/node')} git_http
 */
/**
 * @type {InternalData}
 */
module.exports = {
    ...globalThis.clawffeeInternals.launcher
}