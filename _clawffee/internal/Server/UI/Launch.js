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
                const color = process.platform == "win32"?'white':'black'
                const funcstr = `
if(location.href == "about:blank") location.href = "${page}"
else if(location.protocol+'//'+location.host+location.pathname != "${page}") {
    openWebpage(location.href);
    history.back();
};
const overlaynode = document.createElement('div');
overlaynode.style = "position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: ${color}; z-index: 10000000; transition: top 0.5s ease-in-out;"

document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(overlaynode);
});

document.addEventListener('keydown', (ev) => {
    if(ev.key.startsWith('F') && ev.key.length > 1) {
        if(ev.key == 'F12')
            toggleTerminal();
        ev.preventDefault();
    }
});

window.addEventListener('load', () => {
    overlaynode.style.top = "100vh";
    setTimeout(() => {
        overlaynode.remove();
    }, 500);
    function setupLink(v) {
        const ref = v.href;
        v.href = "#";
        v.addEventListener('click', () => {
            openWebpage(ref);
        });
    }
    document.querySelectorAll('a').forEach(setupLink);
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    node.querySelectorAll('a').forEach(setupLink);
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
});`;
                w.bind("openWebpage", (page) => {
                    self.postMessage({t: 'open', v: page});
                    return {};
                });
                w.bind("debug", (...data) => {
                    console.log(...data)
                    return {};
                });
                w.bind("toggleTerminal", (...data) => {
                    self.postMessage({t: 'terminal'});
                    return {};
                })
                w.init(funcstr);
                w.setHTML(`<!DOCTYPE html>
<html lang="en">
<body style="background-color: ${color};">
<script>
window.onload = () => {
    setTimeout(() => {
    window.location.href = "${page}";
}, 5000)
}
</script>
</body>
</html>`);
                w.run();
                self.postMessage({t: 'exit'});
            })
            break;
    }
});