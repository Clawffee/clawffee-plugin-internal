const config = require('../../version.json');
const { spawn } = require('child_process');

globalThis.clawffeeInternals.launcher.update_info.then((info) => {
    if(info.info.message) return console.warn('couldnt check for updates', info.info.message);
    if(!info.info.tag_name || info.info.tag_name === config.version) return;
    console.log(`\u001b[32mUpdate available for clawffee! \u001b[0m${info.info.tag_name}\n\n\u001b[32mUpdate now at \u001b[0;1;3;4mhttp://localhost:4444/update/internal\u001b[0m\n\n${info.info.body}`);
    require('./Server').functions['/update/internal'] = async () => {
        try {
            const ret = await globalThis.clawffeeInternals.launcher.runUpdate();
            if(await ret) return console.error(ret);
            console.log('Please relaunch clawffee...');
            prompt();
            process.exit(0);
        } catch(e) {
            console.log(e);
        }
    }
})


console.log(`\u001b[0m\n Clawffee Version ${config.version} 🐾`);