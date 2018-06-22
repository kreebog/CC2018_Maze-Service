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
app.set('views', 'views');
app.set('view engine', 'pug');
// configure modules
log.setLogLevel(log.LOG_LEVELS.DEBUG);
// only start the web service after connecting to the database
mongodb_1.MongoClient.connect(DB_URL + DB_NAME, function (err, client) {
    if (err) {
        log.error(__filename, '', JSON.stringify(err));
        return err;
    }
    // get the cc2018 database and the mazes collection
    let db = client.db(DB_NAME);
    let col = db.collection(COL_NAME);
    // all is well, listen for connections
    app.listen(APP_PORT, function () {
        log.info(__filename, '', util_1.format('Listening on port %d', APP_PORT));
        // gets maze with the given id (combination of height:width:seed)
        app.get('/get/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            // search the collection for a maze with the right id
            let cursor = col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/get/10/15/SimpleSample', req.headers.host),
                        errName: err.name,
                        errMsg: err.message
                    });
                }
                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "%s", returning first match.', docs.length, mazeId));
                }
                // if no match found, generate a new maze from the given values
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" not found.', mazeId));
                    res.status(404).send({ 'status': util_1.format('Maze "%s" not found.', mazeId) });
                }
                else {
                    // match was found in the database return it as json
                    log.debug(__filename, req.path, util_1.format('Maze "%s" found, return as JSON...', mazeId));
                    // TODO: Marshalling to and from Maze type is not needed here
                    // Leaving it for now as an example, as it may be useful elsewhere
                    let lMaze = new Maze_1.Maze().loadFromJSON(JSON.stringify(docs[0]));
                    res.status(200).send(JSON.stringify(docs[0]));
                }
            });
        });
        // gets maze with the given id (combination of height:width:seed)
        app.get('/generate/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            // search the collection for a maze with the right id
            let cursor = col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/generate/10/15/SimpleSample', req.headers.host),
                        errName: err.name,
                        errMsg: err.message
                    });
                }
                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "%s", returning first match.', docs.length, mazeId));
                    res.status(400).send({ 'status': util_1.format('Maze "%s" already exists.', mazeId) });
                }
                // if no match found, generate a new maze from the given values
                log.debug(__filename, req.path, util_1.format('Generating maze "%s"...', mazeId));
                // error handling and input checks are in the Maze class - descriptive error will be returned 
                try {
                    let maze = new Maze_1.Maze().generate(req.params.height, req.params.width, req.params.seed);
                    log.debug(__filename, req.path, util_1.format('Maze "%s" generated.  Storing...', mazeId));
                    col.insert(maze);
                    log.debug(__filename, req.path, util_1.format('Returning Maze "%s" as JSON...', mazeId));
                    res.status(200).send(JSON.stringify(maze));
                }
                catch (error) {
                    log.error(__filename, req.path, util_1.format('Error during maze generation: %s', error.message));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/generate/10/15/SimpleSample', req.headers.host),
                        errMsg: error.message
                    });
                }
            });
        });
        /**
         * Lists all mazes currently in the database
         * TODO: Page this?  It might get long...
         */
        app.get('/list', (req, res) => {
            let cursor = col.find({}).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/list', req.headers.host),
                        errName: err.name,
                        errMsg: err.message
                    });
                }
                res.render('list', {
                    responseCode: 200,
                    mazes: docs
                });
            });
        });
        /**
         * Renders a simple view of the maze
         */
        app.get('/view/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            let cursor = col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/view/10/15/SimpleSample', req.headers.host),
                        errName: err.name,
                        errMsg: err.message
                    });
                }
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "', docs.length, mazeId));
                }
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('No maze with id %s found.', mazeId));
                    res.status(404).send({ 'status': util_1.format('Maze "%s%" not found.', mazeId) });
                }
                else {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" found in DB, viewing...', mazeId));
                    res.render('view', {
                        responseCode: 200,
                        maze: docs[0]
                    });
                }
            });
        });
        /**
         * Deletes maze documents with matching ID
         */
        app.get('/delete/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            // delete the first document with the matching mazeId
            col.deleteOne({ id: mazeId }, function (err, results) {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.render('error', {
                        responseCode: 500,
                        endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                        sample: util_1.format('http://%s/view/10/15/SimpleSample', req.headers.host),
                        errName: err.name,
                        errMsg: err.message
                    });
                }
                // send the result code with deleted doc count
                res.status(200).send({ 'deleted_count': results.deletedCount });
                log.debug(__filename, req.path, util_1.format('%d document(s) deleted', results.deletedCount));
            });
        });
        /**
         * Handle favicon requests - using the BCBST favicon.ico
         */
        app.get('/favicon.ico', (req, res) => {
            res.status(200).sendFile(path_1.default.resolve('views/favicon.ico'));
        });
        /**
         * Misrouted traffic catch-all
         */
        app.get('/*', (req, res) => {
            log.debug(__filename, req.path, 'Invalid path in URL.');
            res.render('index', {
                responseCode: 404,
                endpoint: util_1.format('http://%s%s', req.headers.host, req.url),
                sampleGet: util_1.format('http://%s/get/10/15/SimpleSample', req.headers.host),
                sampleView: util_1.format('http://%s/view/10/15/SimpleSample', req.headers.host),
                sampleList: util_1.format('http://%s/list', req.headers.host),
            });
        });
    });
});
//# sourceMappingURL=service.js.map