"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Cardinal directions used for movement, exits, and other direction-based functions
 */
var DIRS;
(function (DIRS) {
    DIRS[DIRS["NORTH"] = 1] = "NORTH";
    DIRS[DIRS["SOUTH"] = 2] = "SOUTH";
    DIRS[DIRS["EAST"] = 4] = "EAST";
    DIRS[DIRS["WEST"] = 8] = "WEST";
})(DIRS = exports.DIRS || (exports.DIRS = {}));
/**
 * Tags for cells, avatar, item, and other functions
 */
var TAGS;
(function (TAGS) {
    TAGS[TAGS["START"] = 1] = "START";
    TAGS[TAGS["FINISH"] = 2] = "FINISH";
    TAGS[TAGS["PATH"] = 4] = "PATH";
    TAGS[TAGS["CARVED"] = 8] = "CARVED";
})(TAGS = exports.TAGS || (exports.TAGS = {}));
// enumeration of possible game results
var GAME_RESULTS;
(function (GAME_RESULTS) {
    GAME_RESULTS[GAME_RESULTS["WIN"] = 0] = "WIN";
    GAME_RESULTS[GAME_RESULTS["OUT_OF_MOVES"] = 1] = "OUT_OF_MOVES";
    GAME_RESULTS[GAME_RESULTS["OUT_OF_TIME"] = 2] = "OUT_OF_TIME";
    GAME_RESULTS[GAME_RESULTS["DEATH_TRAP"] = 3] = "DEATH_TRAP";
    GAME_RESULTS[GAME_RESULTS["DEATH_POISON"] = 4] = "DEATH_POISON";
})(GAME_RESULTS = exports.GAME_RESULTS || (exports.GAME_RESULTS = {}));
/**
 * Returns comma-delimited string of the selected (bitwise) values within
 * the given enumeration.
 *
 * @param targetEnum - Only works with bitwise enumerations!
 * @param selectedBits - Number representing the selected bits
 */
function listSelectedBitNames(targetEnum, selectedBits) {
    let ret = '';
    for (const dir in targetEnum) {
        if (Number(dir)) {
            let bitVal = parseInt(dir);
            if (!!(bitVal & selectedBits)) {
                let stringVal = targetEnum[bitVal];
                ret += (ret.length == 0 ? stringVal : ', ' + stringVal);
            }
        }
    }
    if (ret.length == 0)
        ret = 'NONE';
    return ret;
}
exports.listSelectedBitNames = listSelectedBitNames;
/**
 * Returns string array of the selected (bitwise) values within
 * the given enumeration.
 *
 * @param targetEnum - Only works with bitwise enumerations!
 * @param selectedBits - Number representing the selected bits
 */
function getSelectedBitNames(targetEnum, selectedBits) {
    let ret = new Array();
    for (const dir in targetEnum) {
        if (Number(dir)) {
            let bitVal = parseInt(dir);
            if (!!(bitVal & selectedBits)) {
                let stringVal = targetEnum[bitVal];
                ret.push(stringVal);
            }
        }
    }
    if (ret.length == 0)
        ret.push('NONE');
    return ret;
}
exports.getSelectedBitNames = getSelectedBitNames;
//# sourceMappingURL=Enums.js.map