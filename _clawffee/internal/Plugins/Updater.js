//@ts-check
const config = require('../../../version.json');

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
        if(!globalThis.clawffeeInternals.launcher.verifyHash(folderPath, pubKey)) return reject('Hash of downloaded folder is incorrect!!!');
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
globalThis.clawffeeInternals.launcher.update_info.then((info) => {
    if(info.info.message) return console.warn('couldnt check for updates', info.info.message);
    if(!info.info.name || info.info.name === config.version) return;
    //@ts-ignore
    const updateFile = info.info.assets.find(v => v.name === info.update_data.filename);
    if(!updateFile) return console.warn('upate for clawffee malformed!');
    console.log(`\n\u001b[32mUpdate available for clawffee! \u001b[0m${info.info.tag_name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/internal\u001b[0m\n\n${info.info.body}\n`);
    require('../Server/Server').functions['/update/internal'] = async () => {
        try {
            //@ts-ignore
            const ret = await globalThis.clawffeeInternals.launcher.runUpdate();
            if(ret) return console.error(ret);
            console.log('Please relaunch clawffee...');
            prompt();
            process.exit(0);
        } catch(e) {
            console.log(e);
        }
    }
});

/**
 * 
 * @param {string} path 
 * @param {versionInfo} data 
 * @returns 
 */
async function initUpdate(path, data) {
    if(!data.url) return;
    //@ts-expect-error
    const update_file_name = data.update_file_name ?? path + '.tar.gz';
    const res = await fetch(data.url);
    if(res.status != 200) return console.warn('failed to check for updates for', path);
    const update_info = await res.json();
    if(update_info.name === data.version) return;
    //@ts-expect-error
    const updateFile = update_info.assets.find(v => v.name === update_file_name);
    if(!updateFile) return console.warn(`update for plugin ${path} malformed!`);
    console.log(`\n\u001b[32mUpdate available for plugin \u001b[0m${path}\u001b[32m! \u001b[0m${update_info.name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/${path}\u001b[0m\n\n${update_info.body}\n`);
    require('../Server/Server').functions['/update/' + path] = async () => {
        try {
            const ret = await runUpdate(path, updateFile.url, data.pub_key);
            if(ret) return console.error(ret);
            console.log('Please relaunch clawffee...');
            prompt();
            process.exit(0);
        } catch(e) {
            console.log(e);
        }
    }
}

const fs = require('fs');
const path = require('path');

function verifyModules() {
    const { promise, resolve, reject } = Promise.withResolvers();
    /**
     * @type {{dep: versionInfo, folder: string}[]}
     */
    const missingDeps = [];
    const paths = fs.readdirSync('plugins');
    paths.forEach((p) => {try {
        if(p.endsWith('.upd') || p.endsWith('.bak')) return;
        /**
         * @type {versionInfo}
         */
        if(!fs.existsSync(path.join('plugins', p, 'version.json'))) return;
        const data = JSON.parse(fs.readFileSync(path.join('plugins', p, 'version.json')).toString());
        if(p != 'internal') initUpdate(p, data);
        Object.keys(data.dependencies ?? {}).forEach(folder => {
            folder = path.normalize(folder);
            if(folder.startsWith('..') || path.isAbsolute(folder)) {
                return;
            }
            const dep = data.dependencies[folder];
            if(fs.existsSync(path.join('plugins', folder))) {
                if(!dep.version) {
                    return;
                }
                /**
                 * @type {versionInfo}
                 */
                const otherdata = JSON.parse(fs.readFileSync(path.join('plugins', folder, 'version.json')).toString());
                if(Bun.semver.satisfies(otherdata.version, dep.version)) return;
            }
            // Do version checking here
            missingDeps.push({folder, dep: data.dependencies[folder]});
        });
    } catch(e) {
        console.error("failed to parse", p, e);
        console.error("Exiting...");
        process.exit(1);
    }});
    if(missingDeps.length == 0) {
        return Promise.resolve(true);
    }
    console.log("\n\nThe following plugins need to be installed:\n\n");
    missingDeps.forEach(dep => console.log("\u001b[33m" + dep.folder + "\u001b[0m available at \u001b[32;1;4m" + dep.dep.url + "\u001b[0m"))
    prompt("\n\nPlease confirm...\n\n");
    missingDeps.forEach(async (dep) => {
        const res = await fetch(dep.dep.url, {
            redirect: 'follow'
        });
        if(res.status != 200) return console.warn('failed to check for updates for', path);
        const update_info = await res.json();
        //@ts-ignore
        const updateFile = update_info.assets.find(v => v.name === dep.dep.update_file);
        const ret = await runUpdate(dep.folder, 
            updateFile.url,
            dep.dep.pub_key
        );
        if(ret) return console.error(ret);
        let i = missingDeps.indexOf(dep);
        //@ts-ignore
        if(i != missingDeps.length-1) missingDeps[i] = missingDeps.pop();
        else missingDeps.pop();
        if(missingDeps.length == 0) resolve(false);
    });
    return promise;
}

console.log(`\u001b[0m\n Clawffee Version \u001b[33;1m${config.version}\u001b[0m 🐾`);

module.exports = {
    verifyModules
}