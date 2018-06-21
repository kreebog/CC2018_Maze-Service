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
const mongodb_1 = require("mongodb");
const util_1 = __importDefault(require("util"));
const log = __importStar(require("./Logger"));
const fs_1 = __importDefault(require("fs"));
let AppInfo = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'));
log.setLogLevel(log.LOG_LEVELS.TRACE);
log.info(__filename, '', util_1.default.format('Starting %s v%s in %s', AppInfo.name, AppInfo.version, __dirname));
let dbUrl = 'mongodb://mongodb-code-camp-2018.a3c1.starter-us-west-1.openshiftapps.com';
log.info(__filename, '', util_1.default.format('Connecting to database (%s)', dbUrl));
mongodb_1.MongoClient.connect(dbUrl, function (err, db) {
    if (err)
        throw err;
    console.log('Database created.');
    db.close();
});
/*
let maze = new Maze().generate(10, 10, 'test');
log.info(__filename, '', 'Maze Render:\n' + maze.render());
*/
// mongo info
// database-admin-password: 4jGJLSQryS30aRhs
// database-name: sampledb
// database-password: cc2018-mdbpw
// database-user: mdbuser
