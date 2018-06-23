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
require('dotenv').config();
const path_1 = __importDefault(require("path"));
const Maze_1 = require("./Maze");
const util_1 = require("util");
const log = __importStar(require("./Logger"));
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
// constant value references
const DB_NAME = 'cc2018';
const DB_URL = 'mongodb+srv://mdbuser:cc2018-mdbpw@cluster0-bxvkt.mongodb.net/';
const COL_NAME = 'mazes';
const ENV = process.env['NODE_ENV'] || 'PROD';
const SVC_NAME = 'maze-service';
const PORT = process.env.MAZE_SVC_PORT || 8080;
// create express references
const app = express_1.default();
let httpServer; // will be set with app.listen
let mongoDBClient; // set on successful connection to db
app.set('views', 'views');
app.set('view engine', 'pug');
// set the logging level based on current env
log.setLogLevel((ENV == 'DVLP' ? log.LOG_LEVELS.DEBUG : log.LOG_LEVELS.INFO));
log.info(__filename, SVC_NAME, 'Starting service with environment settings for: ' + ENV);
// only start the web service after connecting to the database
log.info(__filename, SVC_NAME, 'Connecting to MongoDB: ' + DB_URL);
mongodb_1.MongoClient.connect(DB_URL, function (err, client) {
    if (err) {
        log.error(__filename, SVC_NAME, util_1.format('Error connecting to %s:\n%s', DB_URL, JSON.stringify(err)));
        return err;
    }
    mongoDBClient = client;
    // get the cc2018 database and the mazes collection
    let db = client.db(DB_NAME);
    let col = db.collection(COL_NAME);
    // all is well, listen for connections
    httpServer = app.listen(PORT, function () {
        log.info(__filename, SVC_NAME, 'Listening on port ' + PORT);
        // accepts MazeID (string concatenation of Height:Width:Seed)
        app.get('/get/:mazeId', (req, res) => {
            let mazeId = req.params.mazeId;
            // search the collection for a maze with the right id
            col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message) });
                }
                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "%s", returning first match.', docs.length, mazeId));
                }
                // if no match found, generate a new maze from the given values
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" not found.', mazeId));
                    res.status(404).json({ 'status': util_1.format('Maze "%s" not found.', mazeId) });
                }
                else {
                    // match was found in the database return it as json
                    log.debug(__filename, req.path, util_1.format('Maze "%s" found, return as JSON...', mazeId));
                    // TODO: Marshalling to and from Maze type is not needed here
                    // Leaving it for now as an example, as it may be useful elsewhere
                    let lMaze = new Maze_1.Maze().loadFromJSON(JSON.stringify(docs[0]));
                    res.status(200).json(JSON.stringify(docs[0]));
                }
            });
        });
        // Left in for backward compatibility, builds mazeId from original /get/h/w/seed format and redirects 
        // to new /get/mazeId route
        app.get('/get/:height/:width/:seed', (req, res) => {
            log.debug(__filename, req.path, 'Deprecated route - redirecting to /get/mazeId...');
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            return res.redirect('/get/' + mazeId);
        });
        // gets all mazes
        app.get('/get', (req, res) => {
            // search the collection for a maze with the right id
            col.find({}, { fields: { _id: 0, id: 1, height: 1, width: 1, seed: 1 } }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding getting mazes from "%s": %s', COL_NAME, err.message) });
                }
                // if no match found, generate a new maze from the given values
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('No mazes foundin collectoin ""', COL_NAME));
                    res.status(404).json({ 'status': util_1.format('No mazes foundin collectoin ""', COL_NAME) });
                }
                else {
                    // match was found in the database return it as json
                    log.debug(__filename, req.path, util_1.format('%d mazes found in "%s", returning JSON ...', docs.length, COL_NAME));
                    // cosntruct an array with key maze properties and a get url
                    let mazes = new Array();
                    docs.forEach(doc => {
                        let stub = {
                            'id': doc.id,
                            'height': doc.height,
                            'width': doc.width,
                            'seed': doc.seed,
                            'url': util_1.format('http://%s/get/%d/%d/%s', req.headers.host, doc.height, doc.width, doc.seed)
                        };
                        mazes.push(stub);
                    });
                    // send the json data
                    res.status(200).json(JSON.stringify(mazes));
                }
            });
        });
        // gets maze with the given id (combination of height:width:seed)
        app.get('/generate/:height/:width/:seed', (req, res) => {
            let mazeId = util_1.format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            // search the collection for a maze with the right id
            col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message) });
                }
                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 0) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "%s", aborting.', docs.length, mazeId));
                    return res.status(400).json({ 'status': util_1.format('Maze "%s" already exists.', mazeId) });
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
                    res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, error.message) });
                }
            });
        });
        /**
         * Lists all mazes currently in the database
         * TODO: Page this?  It might get long...
         */
        app.get('/list', (req, res) => {
            col.find({}).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error getting all documents from "%s": %s', COL_NAME, err.message) });
                }
                res.render('list', {
                    contentType: 'text/html',
                    responseCode: 200,
                    mazes: docs
                });
            });
        });
        /**
         * Renders a simple view of the maze
         */
        app.get('/view/:mazeId', (req, res) => {
            let mazeId = req.params.mazeId;
            col.find({ id: mazeId }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message) });
                }
                if (docs.length > 1) {
                    log.warn(__filename, req.path, util_1.format('%d mazes found with id "', docs.length, mazeId));
                }
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('No maze with id %s found.', mazeId));
                    return res.status(404).json({ 'status': util_1.format('Maze "%s%" not found.', mazeId) });
                }
                else {
                    log.debug(__filename, req.path, util_1.format('Maze "%s" found in DB, viewing...', mazeId));
                    res.status(200).render('view', {
                        contentType: 'text/html',
                        maze: docs[0]
                    });
                }
            });
        });
        /**
         * Deletes maze documents with matching ID
         */
        app.get('/delete/:mazeId', (req, res) => {
            let mazeId = req.params.mazeId;
            // delete the first document with the matching mazeId
            col.deleteOne({ id: mazeId }, function (err, results) {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message) });
                }
                // send the result code with deleted doc count
                res.status(200).json({ 'deleted_count': results.deletedCount });
                log.info(__filename, req.path, util_1.format('%d document(s) deleted', results.deletedCount));
            });
        });
        /**
         * Handle favicon requests - using the BCBST favicon.ico
         */
        app.get('/favicon.ico', (req, res) => {
            res.setHeader('Content-Type', 'image/x-icon');
            res.status(200).sendFile(path_1.default.resolve('views/favicon.ico'));
        });
        /**
         * Misrouted traffic catch-all
         */
        app.get('/*', (req, res) => {
            log.debug(__filename, req.path, 'Invalid path in URL.');
            res.setHeader('Content-Type', 'text/html');
            res.render('index', {
                contentType: 'text/html',
                responseCode: 404,
                sampleGetAll: util_1.format('http://%s/get', req.headers.host),
                sampleGet: util_1.format('http://%s/get/10:15:SimpleSample', req.headers.host),
                sampleGenerate: util_1.format('http://%s/generate/10/15/SimpleSample', req.headers.host),
                sampleDelete: util_1.format('http://%s/delete/10:15:SimpleSample', req.headers.host),
                sampleView: util_1.format('http://%s/view/10:15:SimpleSample', req.headers.host),
                sampleList: util_1.format('http://%s/list', req.headers.host),
            });
        });
    });
});
/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
    // all done, close the db connection
    log.info(__filename, 'onSigInt()', 'Got SIGINT - Exiting applicaton...');
    doShutdown();
});
/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
    // all done, close the db connection
    log.info(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting applicaton...');
    doShutdown();
});
/**
 * Gracefully shut down the service
 */
function doShutdown() {
    log.info(__filename, 'doShutDown()', 'Closing HTTP Server connections...');
    httpServer.close();
    log.info(__filename, 'doShutDown()', 'Closing Database connections...');
    mongoDBClient.close();
}
//# sourceMappingURL=service.js.map