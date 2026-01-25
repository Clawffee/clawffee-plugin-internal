const config = require('../../version.json');

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
        await new Promise(resolve, setTimeout(resolve, 500));
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
        }
    }, handleDownload);
});}

globalThis.clawffeeInternals.launcher.update_info.then((info) => {
    if(info.info.message) return console.warn('couldnt check for updates', info.info.message);
    if(!info.info.name || info.info.name === config.version) return;
    const updateFile = info.info.assets.find(v => v.name === info.update_data.filename);
    if(!updateFile) return console.warn('upate for clawffee malformed!');
    console.log(`\n\u001b[32mUpdate available for clawffee! \u001b[0m${info.info.tag_name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/internal\u001b[0m\n\n${info.info.body}\n`);
    require('./Server').functions['/update/internal'] = async () => {
        try {
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

const fs = require('fs');
const path = require('path');
fs.readdir('plugins', (err, paths) => {
    if(err) return err;
    paths.forEach(async (p) => {
        if(p == 'internal') return;
        const data = JSON.parse(fs.readFileSync(path.join('plugins', p, 'version.json')));
        if(!data.url) return;
        const update_file_name = data.update_file_name ?? p + '.tar.gz';
        const res = await fetch(data.url);
        if(res.status != '200') return console.warn('failed to check for updates for', p);
        const update_info = await res.json();
        if(update_info.name === data.version) return;
        const updateFile = update_info.assets.find(v => v.name === update_file_name);
        if(!updateFile) return console.warn(`update for plugin ${p} malformed!`);
        console.log(`\n\u001b[32mUpdate available for plugin \u001b[0m${p}\u001b[32m! \u001b[0m${update_info.name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/${p}\u001b[0m\n\n${update_info.body}\n`);
        require('./Server').functions['/update/' + p] = async () => {
            try {
                const ret = await runUpdate(p, updateFile.url, data.pub_key);
                if(ret) return console.error(ret);
                console.log('Please relaunch clawffee...');
                prompt();
                process.exit(0);
            } catch(e) {
                console.log(e);
            }
        }
    });
});


if(!fs.existsSync('plugins/builtin')) {(async () => {
    try {
        const res = await fetch("https://api.github.com/repos/Clawffee/clawffee-plugin-builtin/releases/latest");
        if(res.status != '200') return console.warn('failed to check for updates for', p);
        const update_info = await res.json();
        const updateFile = update_info.assets.find(v => v.name === 'builtin.tar.gz');
        const ret = await runUpdate("builtin", 
            updateFile.url,
            "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAn4dyosEWji6TwLh7OxVL\nbbjOUl2ACT+K279vyojbGimJqgXjsfm650ElRyQbIM2024NM1Ns/1YsMUPOQknxg\nPRcXcAaAADbVINFByebGMudaJVnCkO+2nH1qtsxEOIpKDVGQgLZ+QNqCxxNXbPN+\nY7PAxRd6dlYfLeGIEgkslfTrIZ+R0KyCInTV7MkSVoYvxcN8aBu9tbTpxBDUBY8s\ny4H9eLC1aLjBRX8aCyNhHZhr2ms2vdVM4560gktNNGbRwl480SEQBbc09oZgHrZt\n1PlFH9wGJ8CMFQwsydtQ68UPcmh8QUL04qqij3F1n684hLwCDLi8+kN9SJnFgTPj\nBKioLJ2eQpW/E34B4DNOIcTvfTZD8A8aZsRgzsa0isk0Zam7VP/JzGvzgCIWL/pZ\nS6deyitQxpkc67ffaTemuTG2sTVw0uSiCDGJzSiwLv6CuB6xBRfPSkCkRTc9qAOW\nwxQVN73YgLBKWmx9uQ6aeG+kX1opoEDvbbwgYp595e+k2VVceCT7S6WqJq/S37EW\npmIHwEt5ORHSuyFYbSI7OV3zugIEkhTj7JqblAedHRyXpu2f1wDq2qyRYHofFmsj\n3E2OIPePrrtXOuayzMxYxDH90TELPaPdWGpKwNQbyMB/eC5v+CfC64bQmNsycXHn\n25yPvptKEMqOdqjBpcU7vYcCAwEAAQ==\n-----END PUBLIC KEY-----\n"
        );
        if(ret) return console.error(ret);
        console.log('\n\n\n\u001b[32mInstall Complete! Please relaunch clawffee...');
        prompt();
        process.exit(0);
    } catch(e) {
        console.log(e);
    }
})();}

console.log(`\u001b[0m\n Clawffee Version ${config.version} 🐾`);