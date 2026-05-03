//@ts-check
/**
 * @typedef insertions
 * @prop {string | (() => string)} txt
 * @prop {number} deletedChars
 * @prop {number} deltaLines
 * @prop {number} char
 * @prop {number} line
 * @prop {number} column
 * @prop {number} finalPos
 */
/**
 * 
 * @param {string} str 
 * @returns 
 */
function getLinePositions(str) {
    const lp = [];
    let x = 0;
    do {
        lp.push(x);
    } while ((x = str.indexOf('\n', x) + 1) != 0)
    lp.push(str.length);
    return lp
}
/**
 * 
 * @param {string} original
 */
function createSourceMap(original) {
    /**
     * @type {number[]}
     */
    const originalLinePositions = getLinePositions(original);
    /**
     * @type {insertions[]}
     */
    const insertions = originalLinePositions.map((v, i) => ({
        txt: "",
        deletedChars: 0,
        char: v,
        deltaLines: 0,
        line: i,
        column: 0,
        finalPos: 0
    }));
    /**
     * 
     * @param {string | (() => string)} txt 
     * @param {number} index 
     * @param {number} deletedChars 
     */
    function insert(txt, index, deletedChars) {
        const line = originalLinePositions.findLastIndex((v) => v <= index);
        insertions.unshift({
            txt,
            deletedChars,
            char: index,
            deltaLines: 0,
            line,
            column: index - originalLinePositions[line],
            finalPos: 0
        }) // TODO: causes race-ish condition
        return ret;
    }
    const ret = {
        /**
         * 
         * @param {string | (() => string)} txt 
         * @param {number} char 
         * @param {number} line 
         */
        insert(txt, char, line=0) {
            const index = char + originalLinePositions[line];
            return insert(txt, index, 0);
        },
        /**
         * 
         * @param {number} chars
         * @param {number} char 
         * @param {number} line 
         */
        delete(chars, char, line=0) {
            const index = char + originalLinePositions[line];
            return insert("", index, chars);
        },
        /**
         * 
         * @param {string | (() => string)} txt 
         * @param {number} deletedChars
         * @param {number} char 
         * @param {number} line 
         */
        replace(txt, deletedChars, char, line=0) {
            const index = char + originalLinePositions[line];
            return insert(txt, index, deletedChars);
        },
        build() {
            insertions.sort((a,b) => a.char - b.char);
            for(let x = 0; x < insertions.length-1; x++) {
                if(insertions[x].char + insertions[x].deletedChars > insertions[x+1].char) {
                    const diff = insertions[x+1].char - (insertions[x].char + insertions[x].deletedChars);
                    insertions[x+1].deletedChars = Math.max(insertions[x+1].deletedChars, diff);
                    insertions[x].deletedChars -= diff;
                }
            }
            /**
             * @type {{[line: number]: insertions[]}}
             */
            const insertsPerBuiltLine = {};
            let lineoffset = 0;
            let builtStr = original;
            let offset = 0;
            insertions.forEach(i => {
                const str = typeof i.txt == 'string'?i.txt:i.txt();
                i.deltaLines = str.split('\n').length - original
                    .substring(i.char, i.char + i.deletedChars)
                    .split('\n').length;
                for(let x = Math.min(i.deltaLines, 0); x <= Math.max(0, i.deltaLines); x++)
                    (insertsPerBuiltLine[i.line + lineoffset + x] ??= []).push(i);
                i.finalPos = i.char + offset;
                lineoffset += i.deltaLines;
                builtStr = builtStr.substring(0, i.char + offset)
                    + str
                    + builtStr.substring(i.char + i.deletedChars + offset);
                offset += str.length - i.deletedChars;
            })
            const builtLinePositions = getLinePositions(builtStr);
            /**
             * 
             * @param {number} char 
             * @param {number} line 
             */
            function getChar(char, line=0) {
                const index = char + (builtLinePositions[line] ?? builtLinePositions[builtLinePositions.length-1]);
                const newLine = builtLinePositions.findLastIndex(v => v <= index);
                const inserts = insertsPerBuiltLine[newLine].findLast(v => v.finalPos <= index);
                if(!inserts) throw new Error("Internal SourceMapping error!");
                return Math.max(0, index - inserts.finalPos - inserts.txt.length) + inserts.deletedChars + inserts.char;
            }
            return {
                str: builtStr,
                origina: original,
                originalLinePositions,
                builtLinePositions,
                insertions,
                getChar,
                /**
                 * 
                 * @param {number} char 
                 * @param {number} line 
                 */
                getPos(char, line=0) {
                    const index = getChar(char, line);
                    const oline = originalLinePositions.findLastIndex((v) => v <= index);
                    return {
                        column: index - originalLinePositions[oline],
                        line: oline
                    }
                }
            }
        }
    }
    return ret
}


module.exports = {
    createSourceMap
}