//@ts-check
const fs = require('node:fs');
const path = require('path');

const IGNORED_FOLDERS = ["node_modules"];
// using prefixes to allow for `.bak2`, `.bak3`, etc.
const IGNORED_EXTENSION_PREFIXES = [".bak", ".backup", ".upd", ".orig"];
const IGNORED_PREFIXES = [".", "_"];
const IGNORED_SUFFIXES = ["~", "-"];

/**
 * @param {string} fileName The basename of a file
 * @returns {boolean}
 */
function isFileNameIgnored(fileName) {
    return IGNORED_PREFIXES.some(prefix => fileName.startsWith(prefix))
        || IGNORED_EXTENSION_PREFIXES.some(extensionPrefix => path.extname(fileName).startsWith(extensionPrefix))
        || IGNORED_SUFFIXES.some(suffix => fileName.endsWith(suffix));
}

/**
 * See <https://bford.info/cachedir/>.
 * @param {string} fileName The full path of a directory
 * @returns {boolean}
 */
function isCacheDirectory(fileName) {
    const file = path.join(fileName, "CACHEDIR.TAG");
    const stat = fs.statSync(file, {
        throwIfNoEntry: false
    });
    return (
        // file exists
        stat != null
        // it must be an ordinary file
        && stat.isFile()
        // with utf-8 encoding
        && fs.readFileSync(file, { encoding: "utf-8" })
            // and exactly start with this
            .startsWith("Signature: 8a477f597d28d172789f06886806bc55")
    );
}

/** @type {Parameters<Array<import('fs').Dirent>["sort"]>[0]} */
const order = (a, b) => a.name.localeCompare(b.name);

/** @type {Parameters<Array<import('fs').Dirent>["sort"]>[0]} */
const pluginOrder = (a, b) => {
    if (a.name == 'internal') return -1;
    if (b.name == 'internal') return 1;
    if (a.name == 'builtin') return -1;
    if (b.name == 'builtin') return 1;
    return order(a, b);
};

/**
 * 
 * @param {string} dir 
 * @param {number} depth 
 * @returns 
 */
function requirePluginsRecursively(dir, depth = 0) {
    const fileName = path.basename(dir);
    if (depth == 1) {
        if (isFileNameIgnored(fileName)) return;
        console.debug(`loading ${fileName} plugins`);
    }

    fs.readdirSync(dir, { withFileTypes: true })
        .filter(p => !isFileNameIgnored(p.name))
        .sort(depth == 0 ? pluginOrder : order)
        .forEach(p => {
            const filePath = path.join(p.parentPath, p.name);
            if (p.isDirectory()) {
                if (IGNORED_FOLDERS.includes(fileName) || isCacheDirectory(fileName)) return;
                requirePluginsRecursively(filePath, depth + 1);
            } else if (p.isFile()) {
                const ext = path.extname(p.name);
                if ([".js", ".cjs", ".mjs"].includes(ext)) {
                    try {
                        require(filePath);
                    } catch (e) {
                        console.error(e);
                    }
                } else if ([".jsx", ".ts", ".tsx"].includes(ext)) {
                    if (p.name.endsWith(".d.ts")) {
                        // this one is ignored and the user should not be warned about it
                    } else {
                        console.warn(`the file '${filePath.replaceAll("'", "\\'")}' is not supported by Clawffee`);
                    }
                }
            } else if (p.isSymbolicLink()) {
                console.warn(`ignoring path '${filePath.replaceAll("'", "\\'")}': symbolic links are not supported`);
            }
        });
    if (depth == 0) {
        console.debug(`loaded all plugins!`);
    }
}

module.exports = {
    requirePluginsRecursively,
    isFileNameIgnored,
    isCacheDirectory
}
