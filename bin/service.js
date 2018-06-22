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
const path_1 = __importDefault(require("path"));
const Maze_1 = require("./Maze");
const util_1 = require("util");
const log = __importStar(require("./Logger"));
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
// constant value references
const DB_URL = 'mongodb+srv://mdbuser:cc2018-mdbpw@cluster0-bxvkt.mongodb.net/';
const DB_NAME = 'cc2018';
const COL_NAME = 'mazes';
const APP_PORT = 8080;
// constant object references
const app = express_1.default();
// configure modules
log.setLogLevel(log.LOG_LEVELS.DEBUG);
mongodb_1.MongoClient.connect(DB_URL + DB_NAME, function (err, client) {
    if (err) {
        log.error(__filename, '', JSON.stringify(err));
        return err;
    }
    let db = client.db(DB_NAME);
    let col = db.collection(COL_NAME);
    app.listen(APP_PORT, function () {
        log.info(__filename, '', util_1.format('Listening on port %d', APP_PORT));
        app.get('/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            let cursor = col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.status(500).send('Unable to complete request.');
                }
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "', docs.length, mazeId));
                }
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" not found.  Generating...', mazeId));
                    try {
                        let maze = new Maze_1.Maze().generate(req.params.height, req.params.width, req.params.seed);
                        log.debug(__filename, req.path, util_1.format('Maze "%s" generated.  Storing...', mazeId));
                        col.insert(maze);
                        log.debug(__filename, req.path, util_1.format('Returning Maze "%s" as JSON...', mazeId));
                        res.status(200).send(JSON.stringify(maze));
                    }
                    catch (error) {
                        log.error(__filename, req.path, util_1.format('Error during maze generation: %s', error.message));
                        res.status(400).sendFile(path_1.default.resolve('views/error.html'));
                    }
                }
                else {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" found in DB, return as JSON...', mazeId));
                    let lMaze = new Maze_1.Maze().loadFromJSON(JSON.stringify(docs[0]));
                    res.status(200).send(JSON.stringify(docs[0]));
                }
            });
        });
        app.get('/list', (req, res) => {
            let cursor = col.find({}).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.status(500).send('Unable to complete request.');
                }
                let ret = '<table><th>Seed</th><th>Height</th><th>width</th>\n';
                docs.forEach(doc => {
                    let maze = new Maze_1.Maze().loadFromJSON(JSON.stringify(doc));
                    ret += util_1.format('<tr><td>%s</td><td>%d</td><td>%d</td>\n', maze.getSeed(), maze.getHeight(), maze.getWidth());
                });
                ret += '</table>\n';
                res.status(200).send(ret);
            });
        });
        app.get('/favicon.ico', (req, res) => {
            res.status(200).sendFile(path_1.default.resolve('favicon.ico'));
        });
        app.get('/*', (req, res) => {
            log.debug(__filename, req.path, 'Invalid path in URL.');
            res.status(404).sendFile(path_1.default.resolve('views/index.html'));
        });
    });
});
//# sourceMappingURL=service.js.map