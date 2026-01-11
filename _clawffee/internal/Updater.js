const config = require('../../version.json');

function runUpdate(module, url, pubKey) {

}

globalThis.clawffeeInternals.launcher.update_info.then((info) => {
    if(info.info.message) return console.warn('couldnt check for updates', info.info.message);
    if(!info.info.tag_name || info.info.tag_name === config.version) return;
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
        if(update_info.tag_name === data.version) return;
        console.log(`\n\u001b[32mUpdate available for plugin \u001b[0m${p}\u001b[32m! \u001b[0m${update_info.tag_name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/${p}\u001b[0m\n\n${update_info.body}\n`);
        require('./Server').functions['/update/' + p] = async () => {
            try {
                const ret = await runUpdate(p, update_info, data.pub_key);
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

console.log(`\u001b[0m\n Clawffee Version ${config.version} 🐾`);