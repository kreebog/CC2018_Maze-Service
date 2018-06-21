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
const Maze_1 = require("./Maze");
const AppInfo = JSON.parse(fs_1.default.readFileSync('package.json', 'utf8'));
//const dbcMazes: Collec1tion<any> = ;
log.setLogLevel(log.LOG_LEVELS.INFO);
log.info(__filename, '', util_1.default.format('Starting %s v%s in %s', AppInfo.name, AppInfo.version, __dirname));
let maze = getMaze(10, 12, 'SuperSeedy', 1);
console.log(maze.render());
//TODO: This needs to be a callback
function getMaze(height, width, seed, version) {
    //let dbUrl = 'mongodb://mongodb-code-camp-2018.a3c1.starter-us-west-1.openshiftapps.com:34000/sampledb';
    let dbUrl = 'mongodb+srv://mdbuser:cc2018-mdbpw@cluster0-bxvkt.mongodb.net/cc2018';
    log.info(__filename, '', util_1.default.format('Connecting to database (%s)', dbUrl));
    let maze = new Maze_1.Maze();
    let mazeId = util_1.default.format('%d:%d:%s:%d', height, width, seed, version);
    mongodb_1.MongoClient.connect(dbUrl, function (err, client) {
        if (err) {
            log.error(__filename, '', JSON.stringify(err));
            throw err;
        }
        //get the mazes collection
        let db = client.db('cc2018');
        let colMazes = db.collection('mazes');
        let mazeFound = false;
        colMazes.find({ id: mazeId }).toArray(function (err, docs) {
            if (err) {
                log.error(__filename, '', JSON.stringify(err));
                throw err;
            }
            if (docs.length > 0) {
                mazeFound = true;
                if (docs.length > 0) {
                    log.warn(__filename, 'colMazes.find()', util_1.default.format('%d mazes found with ID!  Returning first match.', docs.length, mazeId));
                    // docs.forEach(doc => {
                    //     log.warn(__filename, 'colMazes.find()', util.format('%d mazes found with ID!  Returning first match.', docs.length, mazeId));
                    // });
                }
                log.info(__filename, 'colMazes.find()', util_1.default.format('Loading mazeId "%s" from database.', mazeId));
                maze.loadFromJSON(JSON.stringify(docs[0]));
            }
        });
        if (!mazeFound) {
            log.info(__filename, 'colMazes.find()', util_1.default.format('No matching maze found in the database. Generating and storing...'));
            maze.generate(height, width, seed, version);
            colMazes.insertOne(maze);
        }
        client.close();
    });
    return maze;
}
// mongo info
// database-admin-password: 4jGJLSQryS30aRhs
// database-name: sampledb
// database-password: cc2018-mdbpw
// database-user: mdbuser
//# sourceMappingURL=service.js.map