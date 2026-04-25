//@ts-check
const { addListener } = require('./Subscribable.js');
const { sharedServerData } = require('./SharedServerData.js');
const { addHook } = require('../Overrides/ConsoleOverrides.js');
const fs = require('fs');

const { getConfig } = require('../Config/GetConfig.js');
const { defaultenv } = require('tscheck');
const configType = '{port: number, printDebug: boolean}';
const config = getConfig(configType, "internal/server.json", {port: 4444, printDebug: false});
const port = config.port;

const firstConnection = Promise.withResolvers();
const builtHTML = Bun.build({entrypoints: ["plugins/internal/_clawffee/internal/Server/UI/UI.html"], target: 'browser', splitting: false, compile: true}).then((value) => value.outputs[0], (err) => firstConnection.reject(`Failed to build UI: ${String(err)}`));
const builtConnect = Bun.build({entrypoints: ["plugins/internal/_clawffee/internal/Server/UI/Connect.js"], target: 'browser', splitting: false}).then((value) => value.outputs[0], (err) => firstConnection.reject(`Failed to build Connect script: ${String(err)}`));
/**
 * @type {{[pluginName: string]: {page: Uint8Array<ArrayBuffer>, script: Uint8Array<ArrayBuffer> | undefined, icon: string?}}}
 */
const pluginPages = {};
sharedServerData.internal.pluginPages = {};

/**
 * 
 * @param {string} pluginName 
 * @param {string | import('./UI/settingsGen.js').Template} UIPath 
 * @param {string?} iconPath
 * @param {string?} scriptPath
 */
async function addPluginTab(pluginName, UIPath, iconPath=null, scriptPath=null) {
    if(!UIPath.endsWith(".html")) {
        throw TypeError('Plugin Tab needs to be an html file');
    }
    const page = await Bun.build({entrypoints: [UIPath], target: 'browser', splitting: false, compile: true});
    const script = (scriptPath?await Bun.build({entrypoints: [scriptPath], target: 'browser', splitting: false}):null);
    pluginPages[pluginName] = {
        page: await (page.outputs[0]?.bytes?.() ?? page.outputs[0]?.text()),
        script: await (script?.outputs[0]?.bytes?.() ?? script?.outputs[0]?.text()),
        icon: iconPath?fs.readFileSync(iconPath).toString():null
    };
    sharedServerData.internal.pluginPages[pluginName] = {
        hasIcon: iconPath?true:false,
        hasScript: scriptPath?true:false
    } 
}

/**
 * 
 * @param {string} url 
 */
function openURL(url) {
    url = encodeURI(url)
    if(process.platform == 'win32') {
        try {
            require('child_process').exec(`start "" "${url}"`)
        } catch(e) {
            // ignore the error since explorer always returns 1
        }
    } else if(process.platform == 'darwin') {
        require('child_process').execFile('open', [url]);
    } else {
        require('child_process').execFile('xdg-open', [url]);
    }
}

/**
 * @type {Bun.Server<any>}
 */
const server = Bun.serve({
    port: port ?? 4444,
    hostname: "localhost",
    reusePort: true,
    websocket: {
        async message(ws, message) {
        },
        async open(ws) {
            if(ws.data.path === "internal") {
                ws.subscribe('internal');
                ws.send(JSON.stringify({
                    p: [],
                    v: sharedServerData.internal
                }));
                firstConnection.resolve();
                return;
            } else {
                ws.send(JSON.stringify({
                    p: [],
                    v: {...sharedServerData, internal: undefined}
                }));
            }
            ws.subscribe('all');
        }
    },
    fetch(req) {
        let extradata = { data: { path: "" } }
        const url = new URL(req.url, 'http://localhost:4444');
        if(url.pathname == '/internal/')
            extradata.data.path = "internal";
        //@ts-ignore
        const success = server.upgrade(req, extradata);
        if (success) {
            return undefined;
        }

        /**
         * 
         * @param {any} res 
         * @returns 
         */
        function wrapIncorrectData(res) {
            if(res instanceof Response) return res;
            if(typeof res == 'string') return new Response(res);
            if(typeof res == 'object') return new Response(JSON.stringify(res));
            if(!res) return new Response("");
            return new Response(String(res));
        }

        if(functions[url.pathname]) {
            try {
                let res = functions[url.pathname](req, url);
                if(res instanceof Promise) {
                    return new Promise((resolve) => {
                        res.then((val) => resolve(wrapIncorrectData(val))).catch((e) => {
                            console.error(e);
                            resolve(new Response('Internal Error: ' + e, {
                                status: 501
                            }));
                        });
                    });
                }
                return wrapIncorrectData(res);
            } catch (e) {
                console.error(e);
                return new Response('Internal Error: ' + e, {
                    status: 501
                })
            }
        }
        console.warn("unknown url", url.pathname);
        return new Response('404 not found', {
            status: 404
        });
    },
    routes: {
        "/internal/dashboard/": async (req) => {
            return new Response(await builtHTML)
        },
        "/internal/dashboard/plugin/page/:plugin": async (req) => {
            let x = decodeURI(req.params.plugin);
            if(!pluginPages[x]) return new Response("", {status: 404})
            return new Response(pluginPages[x].page, {headers: { "content-type": "text/html;charset=utf-8" }});
        },
        "/internal/dashboard/plugin/script/:plugin": async (req) => {
            let x = decodeURI(req.params.plugin);
            if(!pluginPages[x]?.script) return new Response("", {status: 404})
            return new Response(pluginPages[x].script);
        },
        "/internal/dashboard/plugin/icon/:plugin": async (req) => {
            let x = decodeURI(req.params.plugin);
            if(x.endsWith('.svg')) {
                x = x.substring(0, x.length-4);
            }
            if(!pluginPages[x]?.icon) return new Response("", {status: 404})
            return new Response(pluginPages[x].icon);
        },
        "/internal/connect.js": async (req) => new Response(await builtConnect),
        "/favicon.ico": Bun.file("assets/clawffee.ico"),
        "/internal/dashboard/images/:image": (req) => {
            try {
                return new Response(Bun.file(`./images/${req.params.image}`));
            } catch (e) {
                return new Response("data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==");
            }
        }
    }
})

addListener(sharedServerData, "", (path, newValue, oldValue) => {
    if (path[0] == 'internal') {
        server.publish('internal', JSON.stringify({
            v: newValue,
            p: path.slice(1)
        }));
    } else {
        server.publish('all', JSON.stringify({
            v: newValue,
            p: path
        }));
    }
});

/**
 * @type {{[x: string]: (req: Request, url: URL) => any | Promise<any>}}
 */
const functions = {};
clawffeeInternals.serverFunctions = functions;

sharedServerData.internal.log = {};
addHook(({type: name, cleaneddata, smallname}) => {
    sharedServerData.internal.log[name] = {smallname, cleaneddata};
});

const worker = new Worker("plugins/internal/_clawffee/internal/Server/UI/Launch.js", {
    smol: true
});
worker.addEventListener('error', (err) => {
    console.log(err);
    process.exit();
});
worker.addEventListener('message', (m) => {
    switch(m.data?.t) {
        case 'exit': 
            process.exit();
        case 'open': return openURL(m.data?.v);
    }
});

builtHTML.then(async (v) => {
    if(!v) {
        console.error('cannot load');
        process.exit();
    }
    worker.postMessage({t: 'load', v: await v.text()})
})

addPluginTab(
    "Server & GUI", 
    "plugins/internal/_clawffee/internal/Server/UI/ServerConfig.html", 
    "plugins/internal/_clawffee/internal/Server/UI/Server.svg"
);
sharedServerData.internal.serverConfig = config;
functions['/internal/dashboard/plugin/save/Server/'] = async (req) => {
    const changes = await req.json();
    Object.entries(changes).forEach(([key, value]) => {
        config[key] = value;
    }); // TODO: Object.assign does not work with Subscribables
    if(!confirm('Clawffee will close to apply the changes.')) return;
    setTimeout(() => {
        process.exit();
    }, 2000);
}

module.exports = {
    functions,
    config,
    addPluginTab,
    awaitConnection: firstConnection.promise,
    openURL
}