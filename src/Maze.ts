import { format } from 'util';
import seedrandom from 'seedrandom';
import * as log from './Logger';
import * as Enums from './Enums';
import Cell from './Cell';

let carveDepth = 0;     // tracks the level of recursion during path carving
let maxCarveDepth = 0;  // tracks the deepest level of carve recursion seen 
let startGenTime = 0;   // used to determine time spent generating a maze
const MAX_CELL_COUNT = 2500;

export class Maze {
    private cells: Array<Array<Cell>> = new Array();
    private height: number = 0;
    private width: number = 0;
    private seed: string = '';
    private textRender: string = '';
    private id:string = '';

    // don't let the maze get too big or the server will run out of memory during generation
    
    constructor() {
    }

    // loads object from values given in json string
    public loadFromJSON(jsonMaze: string): this {
        let obj = JSON.parse(jsonMaze);

        this.cells = obj.cells;
        this.height = obj.height;
        this.width = obj.width;
        this.seed = obj.seed;
        this.textRender = obj.textRender;
        this.id = obj.id;

        return this;
    }

    public getSeed(): string {
        return this.seed;
    }

    public getHeight(): number {
        return this.height;
    }

    public getWidth(): number { 
        return this.width;
    }

    public getId() : string {
        return this.id;
    }

    /**
     * Generates a new maze based on the given parameters
     * @param height - The height of the maze grid
     * @param width - The width of the maze grid
     * @param seed - PRNG seed value.  If empty, maze will be random and unrepeatable
     */
    public generate(height: number, width: number, seed: string): this {
        if (this.cells.length > 0) {
            log.warn(__filename, 'generate()', 'This maze has already been generated.');
            return this;
        } 

        log.info(__filename, 'generate()', format('Generating new %d (height) x %d (width) maze with seed "%s"', height, width, seed));
        startGenTime = Date.now();

        // validate height and width and collect errors
        let errors = new Array<string>();
        if (isNaN(height)) throw new Error('Height must be numeric.');
        if (isNaN(width)) throw new Error('Width must be numeric.');

        // set the dimensions
        this.height = height;
        this.width = width;

        // check for size constraint
        if (height * width > MAX_CELL_COUNT) {
            throw new Error(format('MAX CELL COUNT (%d) EXCEEDED!  %d*%d=%d - Please reduce Height and/or Width and try again.', MAX_CELL_COUNT, height, width, (height * width)));
        }

        // implement random seed
        if (seed && seed.length > 0) {
            this.seed = seed;
            seedrandom(seed, {global: true});
        }

        // set maze's ID
        this.id = format('%d:%d:%s', this.height, this.width, this.seed);

        // build the empty cells array
        this.cells = new Array(height);

        for (let y: number = 0; y < height; y++) {
            let row: Array<Cell> = new Array();
            for (let x: number = 0; x < width; x++) {
                let cell: Cell = new Cell(0,0);
                cell.setLocation(x, y);
                row.push(cell);
            }
            this.cells[y] = row;

        }

        log.debug(__filename, 'generate()', format('Generated [%d][%d] grid of %d empty cells.', height, width, (height * width)));
        
        // randomize start and finish locations
        let startCol: number = Math.floor(Math.random() * width);
        let finishCol: number = Math.floor(Math.random() * width);
        log.debug(__filename, 'generate()', format('Adding START ([%d][%d]) and FINISH ([%d][%d]) cells.', 0, startCol, height - 1, finishCol));

        // tag start and finish columns (start / finish tags force matching exits on edge)
        this.cells[0][startCol].addTag(Enums.TAGS.START);
        this.cells[height - 1][finishCol].addTag(Enums.TAGS.FINISH);

        // start the carving routine
        this.carvePassage(this.cells[0][0]);

        // render the maze so the text rendering is set
        this.render();

        log.info(__filename, 'generate()', format('Generation Complete: Time=%dms, Recursion=%d, MazeID=%s', (Date.now() - startGenTime), maxCarveDepth, this.getId())); 
        return this;
    }

    private carvePassage(cell: Cell) {
        carveDepth++;
        log.debug(__filename, 'carvePassage()', format('Recursion: %d. Carving STARTED for cell [%d][%d].', carveDepth, cell.getLocation().y, cell.getLocation().x));

        // randomly sort an array of bitwise directional values (see also: Enums.Dirs)
        let dirs = [1, 2, 4, 8].sort(function(a, b){ return 0.5 - Math.random()});

        // wander through the grid using randomized directions provided in dirs[],
        // carving out cells by adding exits as we go
        for (let n: number = 0; n < dirs.length; n++) {
            let ny: number = cell.getLocation().y;
            let nx: number = cell.getLocation().x;

            // move location of next cell according to random direction
            if (dirs[n] < Enums.DIRS.EAST) ny = (dirs[n] == Enums.DIRS.NORTH ? ny - 1 : ny + 1);
            if (dirs[n] > Enums.DIRS.SOUTH) nx = (dirs[n] == Enums.DIRS.EAST ? nx + 1 : nx - 1);
            
            try {
                // if the next call has valid grid coordinates, get it and carve into it
                if (ny >= 0 && ny < this.cells.length && nx >= 0 && nx < this.cells[0].length) { 
                    let nextCell: Cell = this.cells[ny][nx];
                    if (!(nextCell.getTags() & Enums.TAGS.CARVED) && cell.addExit(dirs[n], this.cells)) {
                        
                        // this is a good move, so mark the cell as carved
                        nextCell.addTag(Enums.TAGS.CARVED);

                        // and carve into the next cell
                        this.carvePassage(nextCell);                    
                    }
                }
            } catch {
                // somehow still grabbed an invalid cell
                log.error(__filename, 'carvePassage()', format('Error getting cell [%d][%d].', ny, nx));
            }
        } 

        // update carve depth counters
        if (carveDepth > maxCarveDepth) {
            maxCarveDepth = carveDepth;
        }
        
        // exiting the function relieves one level of recursion
        carveDepth--;
        log.trace(__filename, 'carvePassage()', format('Recursion: %d. Carve COMPLETED for cell [%d][%d].', carveDepth, cell.getLocation().y, cell.getLocation().x));
    }

    /**
     * Returns a text rendering of the maze as a grid of 3x3 
     * character blocks. 
     */
    public render() {
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
                                } else {
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
                            } else if (!!(cell.getTags() & Enums.TAGS.PATH)) { 
                                row += SOLUTION; 
                            } else {
                                row += CENTER;
                            }

                            // always render east walls (with room center)
                            row += !!(cell.getExits() & Enums.DIRS.EAST) ? V_DOOR : V_WALL;
                            
                            break;
                        case 2:
                            // always render south walls
                            if (!!(cell.getTags() & Enums.TAGS.FINISH)) {
                                row += F_DOOR;
                            } else {
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

export default Maze;