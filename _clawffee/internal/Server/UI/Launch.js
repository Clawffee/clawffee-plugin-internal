//@ts-check
/**
 * @var {Worker} self
 */

import { port } from "../../../../../../config/internal/server.json"
import('webview-bun').then(async ({Webview}) => {
    let w = new Webview(false, {
        height: 720,
        width: 720,
        hint: 1
    });
    w.title = "Clawffee";
    w.navigate(`http://localhost:${port}/internal/dashboard/`);
    w.run();
    self.postMessage('exit');
})