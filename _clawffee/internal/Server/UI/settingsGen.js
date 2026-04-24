//@ts-check
/**
 * @typedef StringTemplate
 * @prop {"string"} type
 * @prop {string} [displayName]
 * @prop {string[]} [allowedValues]
 * @prop {RegExp} [filter]
 */
/**
 * @typedef BooleanTemplate
 * @prop {"boolean"} type
 * @prop {string} [displayName]
 */
/**
 * @typedef NumberTemplate
 * @prop {"number"} type
 * @prop {string} [displayName]
 * @prop {number} [max]
 * @prop {number} [min]
 * @prop {number} [step]
 * @prop {boolean} [isInteger]
 */
/**
 * @typedef ObjectTemplate
 * @prop {"object"} type
 * @prop {{[key: string]: Template}} values
 * @prop {string} [displayName]
 * @prop {boolean} [editableKeys]
 */
/**
 * @typedef ArrayTemplate
 * @prop {"array"} type
 * @prop {Template} values
 * @prop {string} [displayName]
 * @prop {number} [min]
 * @prop {number} [max]
 * @prop {boolean} [unique]
 */
/**
 * @typedef HeaderTemplate
 * @prop {"header"} type
 * @prop {Template} value
 * @prop {string} displayName
 */
/**
 * @typedef DescriptionTemplate
 * @prop {"desc"} type
 * @prop {Template} value
 * @prop {string} description
 */
/**
 * @typedef {StringTemplate|NumberTemplate|ObjectTemplate|ArrayTemplate|BooleanTemplate|HeaderTemplate|DescriptionTemplate} Template
 */

const templates = {
    "boolean": `<div class="form-check form-switch">
    <input class="form-check-input" id="$ID" type="checkbox" name="$ID" />
    <label class="form-check-label" for="$ID">$NAME</label>
</div>`,
"string": `<div class="form-floating">
    <input class="form-control" id="$ID" type="text" placeholder="$NAME" />
    <label for="$ID">$NAME</label>
    <div class="invalid-feedback"></div>
</div>`,
"number": `<div class="form-floating">
    <input class="form-control" id="$ID" type="number" placeholder="$NAME" />
    <label for="$ID">$NAME</label>
    <div class="invalid-feedback"></div>
</div>`
}
/**
 * 
 * @param {Template} template 
 * @param {string} defaultname
 * @param {string} id
 */
function getSetting(template, defaultname, id) {
    /**
     * @type {string}
     */
    //@ts-ignore
    let ret = templates[template.type] ?? "";

    ret = ret.replaceAll('$ID', id);

    return ret;
}
/**
 * 
 * @param {{[key: string]: Template}} template 
 */
function generateSettings(template) {
    let builtStr = `
`;
    Object.entries(template).forEach(([key, t]) => {
        builtStr += getSetting(t, key, Bun.randomUUIDv7());
    });
    return builtStr;
}

console.log(generateSettings({
    "meow": {
        type: "string"
    }
}))
module.exports = {
    generateSettings
}