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
const util_1 = require("util");
const seedrandom_1 = __importDefault(require("seedrandom"));
const log = __importStar(require("./Logger"));
const Enums = __importStar(require("./Enums"));
const Cell_1 = __importDefault(require("./Cell"));
let carveDepth = 0; // tracks the level of recursion during path carving
let maxCarveDepth = 0; // tracks the deepest level of carve recursion seen 
let startGenTime = 0; // used to determine time spent generating a maze
const MAX_CELL_COUNT = 2500;
class Maze {
    // don't let the maze get too big or the server will run out of memory during generation
    constructor() {
        this.cells = new Array();
        this.height = 0;
        this.width = 0;
        this.seed = '';
        this.textRender = '';
        this.id = '';
    }
    // loads object from values given in json string
    loadFromJSON(jsonMaze) {
        let obj = JSON.parse(jsonMaze);
        this.cells = obj.cells;
        this.height = obj.height;
        this.width = obj.width;
        this.seed = obj.seed;
        this.textRender = obj.textRender;
        this.id = obj.id;
        return this;
    }
    getSeed() {
        return this.seed;
    }
    getHeight() {
        return this.height;
    }
    getWidth() {
        return this.width;
    }
    getId() {
        return this.id;
    }
    /**
     * Generates a new maze based on the given parameters
     * @param height - The height of the maze grid
     * @param width - The width of the maze grid
     * @param seed - PRNG seed value.  If empty, maze will be random and unrepeatable
     */
    generate(height, width, seed) {
        if (this.cells.length > 0) {
            log.warn(__filename, 'generate()', 'This maze has already been generated.');
            return this;
        }
        log.info(__filename, 'generate()', util_1.format('Generating new %d (height) x %d (width) maze with seed "%s"', height, width, seed));
        startGenTime = Date.now();
        // validate height and width and collect errors
        let errors = new Array();
        if (isNaN(height))
            throw new Error('Height must be numeric.');
        if (isNaN(width))
            throw new Error('Width must be numeric.');
        // set the dimensions
        this.height = height;
        this.width = width;
        // check for size constraint
        if (height * width > MAX_CELL_COUNT) {
            throw new Error(util_1.format('MAX CELL COUNT (%d) EXCEEDED!  %d*%d=%d - Please reduce Height and/or Width and try again.', MAX_CELL_COUNT, height, width, (height * width)));
        }
        // implement random seed
        if (seed && seed.length > 0) {
            this.seed = seed;
            seedrandom_1.default(seed, { global: true });
        }
        // set maze's ID
        this.id = util_1.format('%d:%d:%s', this.height, this.width, this.seed);
        // build the empty cells array
        this.cells = new Array(height);
        for (let y = 0; y < height; y++) {
            let row = new Array();
            for (let x = 0; x < width; x++) {
                let cell = new Cell_1.default(0, 0);
                cell.setLocation(x, y);
                row.push(cell);
            }
            this.cells[y] = row;
        }
        log.debug(__filename, 'generate()', util_1.format('Generated [%d][%d] grid of %d empty cells.', height, width, (height * width)));
        // randomize start and finish locations
        let startCol = Math.floor(Math.random() * width);
        let finishCol = Math.floor(Math.random() * width);
        log.debug(__filename, 'generate()', util_1.format('Adding START ([%d][%d]) and FINISH ([%d][%d]) cells.', 0, startCol, height - 1, finishCol));
        // tag start and finish columns (start / finish tags force matching exits on edge)
        this.cells[0][startCol].addTag(Enums.TAGS.START);
        this.cells[height - 1][finishCol].addTag(Enums.TAGS.FINISH);
        // start the carving routine
        this.carvePassage(this.cells[0][0]);
        // render the maze so the text rendering is set
        this.render();
        log.info(__filename, 'generate()', util_1.format('Generation Complete: Time=%dms, Recursion=%d, MazeID=%s', (Date.now() - startGenTime), maxCarveDepth, this.getId()));
        return this;
    }
    carvePassage(cell) {
        carveDepth++;
        log.debug(__filename, 'carvePassage()', util_1.format('Recursion: %d. Carving STARTED for cell [%d][%d].', carveDepth, cell.getLocation().y, cell.getLocation().x));
        // randomly sort an array of bitwise directional values (see also: Enums.Dirs)
        let dirs = [1, 2, 4, 8].sort(function (a, b) { return 0.5 - Math.random(); });
        // wander through the grid using randomized directions provided in dirs[],
        // carving out cells by adding exits as we go
        for (let n = 0; n < dirs.length; n++) {
            let ny = cell.getLocation().y;
            let nx = cell.getLocation().x;
            // move location of next cell according to random direction
            if (dirs[n] < Enums.DIRS.EAST)
                ny = (dirs[n] == Enums.DIRS.NORTH ? ny - 1 : ny + 1);
            if (dirs[n] > Enums.DIRS.SOUTH)
                nx = (dirs[n] == Enums.DIRS.EAST ? nx + 1 : nx - 1);
            try {
                // if the next call has valid grid coordinates, get it and carve into it
                if (ny >= 0 && ny < this.cells.length && nx >= 0 && nx < this.cells[0].length) {
                    let nextCell = this.cells[ny][nx];
                    if (!(nextCell.getTags() & Enums.TAGS.CARVED) && cell.addExit(dirs[n], this.cells)) {
                        // this is a good move, so mark the cell as carved
                        nextCell.addTag(Enums.TAGS.CARVED);
                        // and carve into the next cell
                        this.carvePassage(nextCell);
                    }
                }
            }
            catch (_a) {
                // somehow still grabbed an invalid cell
                log.error(__filename, 'carvePassage()', util_1.format('Error getting cell [%d][%d].', ny, nx));
            }
        }
        // update carve depth counters
        if (carveDepth > maxCarveDepth) {
            maxCarveDepth = carveDepth;
        }
        // exiting the function relieves one level of recursion
        carveDepth--;
        log.trace(__filename, 'carvePassage()', util_1.format('Recursion: %d. Carve COMPLETED for cell [%d][%d].', carveDepth, cell.getLocation().y, cell.getLocation().x));
    }
    /**
     * Returns a text rendering of the maze as a grid of 3x3
     * character blocks.
     */
    render() {
        const H_WALL = '+---';
        const S_DOOR = '+ S ';
        const F_DOOR = '+ F ';
        const V_WALL = '|';
        const H_DOOR = '+   ';
        const V_DOOR = ' ';
        const CENTER = '   ';
        const SOLUTION = ' = ';
        const ROW_END = '+';
        const CARVED = ' . ';
        const AVATAR = ' @ ';
        if (this.textRender.length > 0) {
            return this.textRender;
        }
        let textMaze = '';
        // walk the array, one row at a time
        for (let y = 0; y < this.height; y++) {
            for (let subRow = 0; subRow < 3; subRow++) {
                let row = '';
                // each text-cell is actually three 
                for (let x = 0; x < this.width; x++) {
                    let cell = this.cells[y][x];
                    switch (subRow) {
                        case 0:
                            // only render north walls on first row
                            if (y == 0) {
                                if (!!(cell.getTags() & Enums.TAGS.START)) {
                                    row += S_DOOR;
                                }
                                else {
                                    row += !!(cell.getExits() & Enums.DIRS.NORTH) ? H_DOOR : H_WALL;
                                }
                            }
                            break;
                        case 1:
                            // only render west walls on first column
                            if (x == 0) {
                                row += !!(cell.getExits() & Enums.DIRS.WEST) ? V_DOOR : V_WALL;
                            }
                            // render room center - check for cell properties and render appropriately
                            if (!!(cell.getTags() & Enums.TAGS.CARVED)) {
                                row += CARVED;
                            }
                            else if (!!(cell.getTags() & Enums.TAGS.PATH)) {
                                row += SOLUTION;
                            }
                            else {
                                row += CENTER;
                            }
                            // always render east walls (with room center)
                            row += !!(cell.getExits() & Enums.DIRS.EAST) ? V_DOOR : V_WALL;
                            break;
                        case 2:
                            // always render south walls
                            if (!!(cell.getTags() & Enums.TAGS.FINISH)) {
                                row += F_DOOR;
                            }
                            else {
                                row += !!(cell.getExits() & Enums.DIRS.SOUTH) ? H_DOOR : H_WALL;
                            }
                            break;
                    }
                }
                if (subRow != 1) {
                    row += ROW_END;
                }
                // end the line - only draw the top subRow if on the first line
                if ((subRow == 0 && y == 0) || (subRow > 0)) {
                    textMaze += row + '\n';
                }
            }
        }
        this.textRender = textMaze.toString();
        return textMaze;
    }
}
exports.Maze = Maze;
exports.default = Maze;
//# sourceMappingURL=Maze.js.map