//@ts-check
/**
 * @var {Worker} self
 */

import { port } from "../../../../../../config/internal/server.json"
self.addEventListener('message', event => {
    switch(event.data.t) {
        case 'load':
            import('webview-bun').then(async ({Webview}) => {
                let w = new Webview(false, {
                    height: 720,
                    width: 720,
                    hint: 1
                });
                w.title = "Clawffee";
                const page = `http://localhost:${port}/internal/dashboard/`;
                w.setHTML(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body style="background-color: black;">
    
</body>
</html>`);
                const funcstr = `
                    if(location.href == "about:blank") location.href = "${page}"
                    else if(location.protocol+'//'+location.host+location.pathname != "${page}") {
                        openWebpage(location.href);
                        history.back();
                    };
                `;
                w.bind("openWebpage", (page) => {
                    self.postMessage({t: 'open', v: page});
                });
                w.init(funcstr);
                w.run();
                self.postMessage({t: 'exit'});
            })
            break;
    }
});