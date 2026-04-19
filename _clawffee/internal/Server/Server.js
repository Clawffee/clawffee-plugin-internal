//@ts-check
const { addListener } = require('./Subscribable.js');
const { sharedServerData } = require('./SharedServerData.js');
const { addHook } = require('../Overrides/ConsoleOverrides.js');
const fs = require('fs');
if(!fs.existsSync('./config/internal/server.json')) {
    fs.writeFileSync('./config/internal/server.json', JSON.stringify({
        port: 4444
    }, null, 4))
}
const {port} = require('../../../../../config/internal/server.json');
const builtHTML = Bun.build({entrypoints: ["plugins/internal/_clawffee/internal/Server/UI/UI.html"], target: 'browser', splitting: false, compile: true}).then((value) => value.outputs[0]);
const builtConnect = Bun.build({entrypoints: ["plugins/internal/_clawffee/internal/Server/UI/Connect.js"], target: 'browser', splitting: false}).then((value) => value.outputs[0]);
/**
 * @type {Bun.Server<any>}
 */
const server = Bun.serve({
    port: port ?? 4444,
    hostname: "localhost",
    websocket: {
        async message(ws, message) {
        },
        async open(ws) {
            if(ws.data.path === "internal") {
                ws.subscribe('internal');
                ws.send(JSON.stringify({
                    p: [],
                    v: sharedServerData
                }));
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
        "/internal/dashboard/": async (req) => new Response(await builtHTML),
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
    if(name != 'debug') {
        sharedServerData.internal.log[name] = {smallname, cleaneddata};
    }
});

module.exports = {
    functions,
    config: {
        port: 4444
    }
}