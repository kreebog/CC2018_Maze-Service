import path from 'path';
import util from 'util';

// console output colors
enum COLORS {
    NONE = '\x1b[49m\x1b[0m',
    RED = '\x1b[49m\x1b[31m',
    YELLOW = '\x1b[49m\x1b[35m',
    BLUE = '\x1b[49m\x1b[36m',
    MAGENTA = '\x1b[49m\x1b[35m',
    WHITE_ON_RED = '\x1b[41m\x1b[37m',
    RED_UNDERLINE = '\x1b[4m\x1b[37m'

}

export enum LOG_LEVELS { 
    NONE = 0, 
    ERROR,
    WARN,
    INFO,
    DEBUG,
    TRACE
}

let logLevel = LOG_LEVELS.INFO;

// returns the current timestamp
function getTimeStamp(): string {
    var dt = new Date();
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
}

// strips path and returns just the name (and extension) of the file
function fileName(file: string) {
    return typeof file  !== 'undefined' ?  path.basename(file) : 'FILE_UNKNOWN';
}

export function setLogLevel(level: LOG_LEVELS) {
    logLevel = level;
    info(__filename, 'setLogLevel(' + level + ')', 'Log level set to ' + LOG_LEVELS[level]);
}

export function debug(file: string, method: string, message: string) {
    if (logLevel >= LOG_LEVELS.DEBUG) {
        console.log('%s%s : %s : %s' + (method == '' ? '' : ' : ') + '%s : %s%s', COLORS.BLUE, getTimeStamp(), 'DEBUG', fileName(file), method, message, COLORS.NONE);
    }
}

export function error(file: string, method: string, message: string) {
    if (logLevel >= LOG_LEVELS.ERROR) {
        console.log('%s%s : %s : %s' + (method == '' ? '' : ' : ') + '%s : %s%s', COLORS.RED, getTimeStamp(), 'ERROR', fileName(file), method, message, COLORS.NONE);
    }
}

export function warn(file: string, method: string, message: string) {
    if (logLevel >= LOG_LEVELS.WARN) {
        console.log('%s%s : %s : %s' + (method == '' ? '' : ' : ') + '%s : %s%s', COLORS.YELLOW, getTimeStamp(), 'WARN', fileName(file), method, message, COLORS.NONE);
    }
}

export function info(file: string, method: string, message: string) {
    if (logLevel >= LOG_LEVELS.INFO) {
        console.log('%s%s : %s : %s' + (method == '' ? '' : ' : ') + '%s : %s%s', COLORS.NONE, getTimeStamp(), 'INFO', fileName(file), method, message, COLORS.NONE);
    }
}

export function trace(file: string, method: string, message: string) {
    if (logLevel >= LOG_LEVELS.TRACE) {
        console.log('%s%s : %s : %s' + (method == '' ? '' : ' : ') + '%s : %s', COLORS.MAGENTA, getTimeStamp(), 'TRACE', fileName(file), method, message, COLORS.NONE);
    }
}