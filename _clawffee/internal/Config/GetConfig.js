//@ts-check
const { defaultenv } = require("tscheck");
const fs = require('fs');
const { createServer, addListener } = require("../Server/Subscribable");
const { join } = require('path');
const dir = join(process.cwd(), 'config')

/**
 * 
 * @param {string} template 
 * @param {string} path 
 * @param {any} _default
 * @param {(err: Error) => void} errCallback 
 */
function getConfig(template, path, _default, errCallback=(err) => console.error("Regenerating Config!", err)) {
    path = join(dir, path);
    let x;
    try {
        if(fs.existsSync(path)) x = JSON.parse(fs.readFileSync(path).toString());
        try {
            defaultenv.throw(template)(x);
        } catch(e) {
            x = undefined;
        }
    } catch(e) {
        //@ts-ignore
        errCallback(e);
    }
    if(!x) {
        x = _default;
        defaultenv.throw(template)(x);
        fs.writeFile(path, JSON.stringify(x, null, 4), (err) => {
            if(err) errCallback(err);
        });
    }
    x = createServer(x);
    /**
     * @type {any}
     */
    let timeout;
    //@ts-ignore
    addListener(x, [], () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            fs.writeFile(path, JSON.stringify(x, null, 4), (err) => {
                if(err) errCallback(err);
            });
        }, 100);
    })
    return x;
}

module.exports = {
    getConfig
}