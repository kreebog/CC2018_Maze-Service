"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
const log = __importStar(require("./Logger"));
const Enums = __importStar(require("./Enums"));
/**
 * Used to determine mode of functions modifying cell exits
 */
var FN_MODES;
(function (FN_MODES) {
    FN_MODES[FN_MODES["ADD"] = 0] = "ADD";
    FN_MODES[FN_MODES["REMOVE"] = 1] = "REMOVE";
})(FN_MODES || (FN_MODES = {}));
/**
 * Represents a single cell in a maze
 */
class Cell {
    constructor(exits, tags) {
        this.x = 0;
        this.y = 0;
        this.exits = 0;
        this.tags = 0;
        this.visits = 0;
        this.lastVisit = 0;
        this.notes = new Array();
        this.exits = exits;
        this.tags = tags;
    }
    addNote(note) {
        this.notes.push(note);
        log.debug(__filename, 'addNote()', 'Note added to cell: ' + note);
    }
    getNotes() {
        return this.notes;
    }
    addVisit(moveNumber) {
        this.visits++;
        this.lastVisit = moveNumber;
    }
    getVisitCount() {
        return this.visits;
    }
    getLastVisitMoveNum() {
        return this.lastVisit;
    }
    getExits() {
        return this.exits;
    }
    listExits() {
        return Enums.listSelectedBitNames(Enums.DIRS, this.exits);
    }
    /**
     * Adds exit to a cell if exit doesn't already exist.
     * Also adds neighboring exit to valid, adjoining cell.
     *
     * @param dir
     * @param cells
     * @returns boolean
     */
    addExit(dir, cells) {
        return this.setExit(FN_MODES.ADD, dir, cells);
    }
    /**
     * Adds exit to a cell if exit doesn't already exist.
     * Also adds neighboring exit to valid, adjoining cell.
     *
     * @param dir
     * @param cells
     * @returns boolean
     */
    removeExit(dir, cells) {
        return this.setExit(FN_MODES.REMOVE, dir, cells);
    }
    /**
     * Returns the opposing direction for a given direction
     * @param dir
     */
    reverseDir(dir) {
        switch (dir) {
            case Enums.DIRS.NORTH: return Enums.DIRS.SOUTH;
            case Enums.DIRS.SOUTH: return Enums.DIRS.NORTH;
            case Enums.DIRS.EAST: return Enums.DIRS.WEST;
            case Enums.DIRS.WEST: return Enums.DIRS.EAST;
            default: return 0;
        }
    }
    /**
     * Adds or Removes cell exits, depending on SET_EXIT_MODES value.
     * Also adds or removes opposite exit from valid, adjoining cell.
     *
     * @param dir
     * @param cells
     * @returns boolean
     */
    setExit(mode, dir, cells) {
        let modeName = (mode == FN_MODES.ADD ? 'ADD' : 'REMOVE');
        let dirName = Enums.DIRS[dir];
        let validMove = true; // only set to true if valid adjoining cell exits to open an exit to
        log.debug(__filename, util_1.default.format('setExit(%s, %s)', modeName, dirName), util_1.default.format('Setting exits in cell [%d][%d]. Existing exits: %s.', this.y, this.x, this.listExits()));
        if (mode == FN_MODES.ADD ? !(this.exits & dir) : !!(this.exits & dir)) {
            let nLoc = { y: -1, x: -1 }; // location adjoining cell - must open exit on both sides
            switch (dir) {
                case Enums.DIRS.NORTH:
                    validMove = this.y > 0;
                    nLoc = { y: this.y - 1, x: this.x };
                    break;
                case Enums.DIRS.SOUTH:
                    validMove = this.y < cells.length;
                    nLoc = { y: this.y + 1, x: this.x };
                    break;
                case Enums.DIRS.EAST:
                    validMove = this.x < cells[0].length;
                    nLoc = { y: this.y, x: this.x + 1 };
                    break;
                case Enums.DIRS.WEST:
                    validMove = this.x > 0;
                    nLoc = { y: this.y, x: this.x - 1 };
                    break;
            }
            if (validMove) {
                let neighbor = cells[nLoc.y][nLoc.x];
                this.exits = (mode == FN_MODES.ADD ? this.exits += dir : this.exits -= dir);
                log.debug(__filename, util_1.default.format('setExit(%s, %s)', modeName, dirName), util_1.default.format('Exits set in cell [%d][%d]. Exits: ', this.y, this.x, this.listExits()));
                neighbor.exits = (mode == FN_MODES.ADD ? neighbor.exits += this.reverseDir(dir) : neighbor.exits -= dir);
                log.debug(__filename, util_1.default.format('setExit(%s, %s)', modeName, dirName), util_1.default.format('Adjoining exits set in cell [%d][%d]. Exits: ', neighbor.y, neighbor.x, neighbor.listExits()));
            }
            else {
                log.warn(__filename, util_1.default.format('setExit(%s, %s)', modeName, dirName), util_1.default.format('Invalid adjoining cell location: [%d][%d]', nLoc.y, nLoc.x));
            }
        }
        else {
            log.warn(__filename, util_1.default.format('setExit(%s, %s)', modeName, dirName), util_1.default.format('Invalid action in cell [%d][%d]. Exit %s. Cell exits: %s', this.y, this.x, (mode == FN_MODES.ADD ? 'already exists' : 'not found'), this.listExits()));
        }
        return validMove;
    }
    /**
     * Returns an array representing the cells grid coordinates (y, x)
     */
    getLocation() {
        return { y: this.y, x: this.x };
    }
    /**
     * Set the cell's grid coordinates
     * @param x
     * @param y
     */
    setLocation(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * Returns the bitwise integer value representing cell tags
     */
    getTags() {
        return this.tags;
    }
    /**
     * Returns list of string values representing cell tags
     */
    listTags() {
        return Enums.listSelectedBitNames(Enums.TAGS, this.tags);
    }
    /**
     * Adds an Enums.Tag to this cell if it doesn't already exist
     * @param tag
     */
    addTag(tag) {
        let tagName = Enums.TAGS[tag];
        if (!(this.tags & tag)) {
            this.tags += tag;
            switch (tag) {
                case Enums.TAGS.START:
                    // force north exit on start cell - do not use addExit() for this!
                    if (!(this.exits & Enums.DIRS.NORTH)) {
                        this.exits += Enums.DIRS.NORTH;
                        log.debug(__filename, 'addTag(' + tagName + ')', util_1.default.format('[%d][%d] has %s tag. Forcing NORTH exit through edge. Cell exits: %s', this.y, this.x, tagName, this.listExits()));
                    }
                    break;
                case Enums.TAGS.FINISH:
                    // force north exit on finish cell - do not use addExit() for this!
                    if (!(this.exits & Enums.DIRS.SOUTH)) {
                        this.exits += Enums.DIRS.SOUTH;
                        log.debug(__filename, 'addTag(' + tagName + ')', util_1.default.format('[%d][%d] has %s tag. Forcing NORTH exit through edge. Cell exits: %s', this.y, this.x, tagName, this.listExits()));
                    }
                    break;
            }
            log.debug(__filename, 'addTag(' + tagName + ')', util_1.default.format('Tag %s added to cell [%d][%d]. Current tags: %s.', tagName, this.y, this.x, this.listTags()));
        }
        else {
            log.warn(__filename, 'addTag(' + tagName + ')', util_1.default.format('Tag %s already exists in cell [%d][%d]. Current tags: %s.', tagName, this.y, this.x, this.listTags()));
        }
    }
    /**
     * Removes a tag from this cell, if it exists
     * @param tag
     */
    removeTag(tag) {
        let tagName = Enums.TAGS[tag];
        if (!!(this.tags & tag)) {
            this.tags -= tag;
            log.debug(__filename, 'removeTag(' + tagName + ')', util_1.default.format('Tag %s removed from cell [%d][%d]. Current tags: %s.', tagName, this.y, this.x, this.listTags()));
        }
        else {
            log.warn(__filename, 'removeTag(' + tagName + ')', util_1.default.format('Tag %s not found in cell [%d][%d]. Current tags: %s.', tagName, this.y, this.x, this.listTags()));
        }
    }
}
exports.default = Cell;
//# sourceMappingURL=Cell.js.map