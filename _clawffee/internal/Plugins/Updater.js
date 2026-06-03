//@ts-check
const config = require('../../../version.json');

const launcher = require('../Globals/launcher');

const fs = require('fs');
const path = require('path');
const { sharedServerData } = require('../Server/SharedServerData');
const internal = require('../../../internal');
const { functions } = require('../Server/Server');
const { isFileNameIgnored, isCacheDirectory, getAllPluginFolders } = require('./PluginLoader');

/**
 * 
 * @param {string} folder
 * @param {import('./PluginLoader').PluginData} data 
 */
async function installPlugin(folder, data) {
    const { git, git_http } = launcher;
    const dir = path.join("plugins", folder + '.upd');
    try {
        try {
            fs.rmSync(dir, {recursive: true});
        } catch(_) {}
        fs.mkdirSync(dir, {recursive: true});
    } catch(e) {
        throw new Error("failed to create the plugin folder!", {
            cause: e
        });
    }
    await git.clone({ 
            fs, http: git_http, dir,
            url: data.url,
            singleBranch: true,
            depth: 1,
            ref: data.branch,
            onProgress(v) {
                console.log(v.phase);
                console.log(v.loaded / v.total || 0);
            }
        });
        console.log('done!');
        if(!launcher.verifyHash(dir, data.pub_key)) {
            throw new Error("plugin failed to pass hash verification!");
        }
        fs.renameSync(dir, dir.substring(0, dir.length-4));
        return true;
}

/**
 * 
 * @param {string} path 
 * @param {import('./PluginLoader').PluginData} data 
 */
function updatePlugin(path, data) {

}

/**
 * @typedef versionInfo
 * @prop {string} url url where to catch the update
 * @prop {string} version version name
 * @prop {string} update_file file name of the update
 * @prop {string} pub_key public key of the update hash
 * @prop {string} hash version hash
 * @prop {{[name: string]: versionInfo}} dependencies list of folders where to install dependency plugins
 */

/**
 * 
 * @param {*} module 
 * @param {*} url 
 * @param {*} pubKey 
 * @returns {Promise<void|string>}
 */
function runUpdate(module, url, pubKey) {return new Promise((resolve, reject) => {
    const path = require('path');
    const { IncomingMessage } = require('http');
    const fs = require('fs');
    const folderPath = path.join('plugins', module + '.upd');
    if(fs.existsSync(folderPath)) fs.rmSync(folderPath, {recursive: true, force: true});
    fs.mkdirSync(folderPath);
    if(!url) {
        return reject('failed to find the required update file');
    }
    console.log(url);
    async function verifyDownload() {
        console.log(`finished inflating update ${module} at ${folderPath}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        //@ts-ignore
        if(!launcher.verifyHash(folderPath, pubKey)) return reject('Hash of downloaded folder is incorrect!!!');
        try {
            fs.rmSync(`plugins/${module}.bak`, {force: true, recursive: true});
        } catch(e) {} // can silently fail
        try {
            fs.renameSync(`plugins/${module}`, `plugins/${module}.bak`);
        } catch(e) {} // can silently fail, either means the file doesnt exist or it will fail loudly in the next step
        try {
            fs.renameSync(folderPath, `plugins/${module}`);
        } catch(e) {
            return reject('failed to move the update to the required position');
        }
        resolve();
    }

    const https = require('https');
    /**
     * 
     * @param {IncomingMessage} res 
     * @returns 
     */
    function handleDownload(res) {
        if(res.statusCode == 302) {
            //@ts-ignore
            https.get(res.headers.location, {
                headers: {
                    "Accept": "application/octet-stream",
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            }, handleDownload);
            return;
        }
        const tar = require('tar-stream');
        const gzip = require('zlib');
        const zipFile = tar.extract();
        let writers = 0;
        let finished = false;
        zipFile.on('entry', (headers, stream, next) => {
            if(path.posix.normalize(headers.name).startsWith('../')) {
                return reject(`path ${headers.name} is pointing outside the folder!!!`);
            }
            fs.mkdirSync(path.join(folderPath, path.dirname(headers.name)), {recursive: true});
            writers++;
            stream.pipe(fs.createWriteStream(path.join(folderPath, headers.name))).on('finish', () => {
                writers--;
                if(writers == 0 && finished) verifyDownload();
            });
            stream.on('end', () => {
                next();
            });
        }).once('close', () => {
            finished = true;
            if(writers == 0) verifyDownload();
        });
        res.pipe(gzip.createGunzip()).pipe(zipFile);
    }
    https.get(url, {
        headers: {
            "Accept": "application/octet-stream",
            "X-GitHub-Api-Version": "2022-11-28"
        },
    }, handleDownload);
});}

//@ts-ignore
launcher.updateInfo.catch(() => {
    console.warn('couldnt check for updates');
});
launcher.updateInfo.then((info) => {
    return; //TODO
    if(typeof info == 'string') {
        return console.warn(info);
    }
    if(!info) return console.warn('couldnt check for updates');
    if(info.info.message) return console.warn('couldnt check for updates', info.info.message);
    if(!info.info.name || info.info.name === config.version) return;
    //@ts-ignore
    const updateFile = info.info.assets.find(v => v.name === info.update_data.filename);
    if(!updateFile) return console.warn('upate for clawffee malformed!');
    console.log(`\n\u001b[32mUpdate available for clawffee! \u001b[0m${info.info.tag_name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/internal\u001b[0m\n\n${info.info.body}\n`);
    require('../Server/Server').functions['/update/internal'] = async () => {
        try {
            //@ts-ignore
            const ret = await launcher.runUpdate();
            if(ret) return console.error(ret);
            prompt('Please relaunch clawffee...');
            process.exit(0);
        } catch(e) {
            console.log(e);
        }
    }
});

/**
 * 
 * @param {string} path 
 * @returns 
 */
async function hasUpdate(path) {
    const { git, git_http } = launcher;
    try {    
        // Get current commit hash
        const currentCommit = await git.resolveRef({ 
            fs, 
            dir: path,
            ref: 'HEAD'
        });
        const branch = await git.currentBranch({
            fs, 
            dir: path,
            fullname: true
        });
        // Get remote commit hash for the branch
        const remoteURL = (await git.listRemotes({
            fs,
            dir: path
        }))[0]?.url;
        if(!remoteURL) {
            return false;
        }
        const remoteCommit = (await git.listServerRefs({
            http: git_http,
            url: remoteURL
        })).find(ref => ref.ref == branch);
        return (remoteCommit?.oid ?? currentCommit) !== currentCommit;
    } catch(e) {
        console.error(`Error checking updates for ${path}:`, e);
        return [false, null, null];
    }
}

/**
 * 
 * @param {string} path 
 * @param {versionInfo} data 
 * @returns 
 */
async function initUpdate(path, data) {
    if(!await hasUpdate(path)) {
        return;
    }
    sharedServerData.internal.updateInfo.updates ??= {};
    sharedServerData.internal.updateInfo.updates[path] = true;
}

function verifyModules() {return new Promise(
(resolve, reject) => getAllPluginFolders("plugins").then(x => {
    /**
     * @type {{dep: versionInfo, folder: string}[]}
     */
    const missingDeps = [];
    Object.entries(x).forEach(([p, v]) => {
        initUpdate(p, v);
        Object.entries(v.dependencies ?? {}).forEach(([dp, dv]) => {
            dp = path.normalize(dp);
            if(dp.startsWith('..') || dp == "." || path.isAbsolute(dp)) {
                return;
            }
            const fdp = path.join('plugins', dp);
            if(x[fdp] && Bun.semver.satisfies(x[fdp].version, dv.version)) return;
            missingDeps.push({folder: dp, dep: dv});
        });
    });
    if(missingDeps.length == 0) return resolve(true);
    console.log("\n\nThe following plugins need to be installed:\n\n");
    missingDeps.forEach(dep => console.log("\u001b[33m" + dep.folder + "\u001b[0m available at \u001b[32;1;4m" + dep.dep.url + "\u001b[0m"))
    console.log("\n");
    functions['/internal/updater/installMissingDeps/'] = () => {
        delete functions['/internal/updater/installMissingDeps/'];
        missingDeps.forEach(async (dep) => {
            try {
                await installPlugin(dep.folder, dep.dep);
                missingDeps.filter(x => x != dep);
                if(missingDeps.length == 0) resolve(false);
            } catch(err) {
                reject(err);
            }
        });
    }
    sharedServerData.internal.updateInfo.missingDeps = missingDeps;
}));}

sharedServerData.internal.updateInfo = {
    version: config.version,
    availableUpdates: null,
    missingDeps: null,
    state: 'launching...',
    error: null
};

console.log(`\u001b[0m\n Clawffee Version \u001b[33;1m${config.version}\u001b[0m 🐾`);

module.exports = {
    verifyModules
}