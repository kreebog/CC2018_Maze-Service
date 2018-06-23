/**
 * Cardinal directions used for movement, exits, and other direction-based functions
 */
export enum DIRS {
    NORTH = 1,
    SOUTH = 2,
    EAST = 4,
    WEST = 8
}

/**
 * Tags for cells, avatar, item, and other functions 
 */
export enum TAGS { 
    START = 1,
    FINISH = 2, 
    PATH = 4,
    CARVED = 8
}

// enumeration of possible game results
export enum GAME_RESULTS {
    WIN = 0,
    OUT_OF_MOVES,
    OUT_OF_TIME,
    DEATH_TRAP,
    DEATH_POISON
}


/**
 * Returns comma-delimited string of the selected (bitwise) values within 
 * the given enumeration.  
 * 
 * @param targetEnum - Only works with bitwise enumerations!
 * @param selectedBits - Number representing the selected bits
 */
export function listSelectedBitNames(targetEnum: Object, selectedBits: number): string {
    let ret: string = '';

    for (const dir in targetEnum) {
        if (Number(dir)) {
            let bitVal: number = parseInt(dir);
            if (!!(bitVal & selectedBits)) {
                let stringVal: string = (<any>targetEnum)[bitVal];
                ret += (ret.length == 0 ? stringVal : ', ' + stringVal);
            }
        }
    }

    if (ret.length == 0) ret = 'NONE';
    return ret;
}

/**
 * Returns string array of the selected (bitwise) values within 
 * the given enumeration.  
 * 
 * @param targetEnum - Only works with bitwise enumerations!
 * @param selectedBits - Number representing the selected bits
 */
export function getSelectedBitNames(targetEnum: Object, selectedBits: number): Array<string> {
    let ret: Array<string> = new Array<string>();

    for (const dir in targetEnum) {
        if (Number(dir)) {
            let bitVal: number = parseInt(dir);
            if (!!(bitVal & selectedBits)) {
                let stringVal: string = (<any>targetEnum)[bitVal];
                ret.push(stringVal);
            }
        }
    }

    if (ret.length == 0) ret.push('NONE');
    return ret;
}
