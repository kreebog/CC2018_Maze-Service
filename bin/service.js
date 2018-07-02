"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const cc2018_ts_lib_1 = require("cc2018-ts-lib");
// get singleton logger instance
const log = cc2018_ts_lib_1.Logger.getInstance();
log.setLogLevel(parseInt(process.env['LOG_LEVEL'] || '3')); // defaults to "INFO"
// constants from environment variables (or .env file)
const NODE_ENV = process.env['NODE_ENV'] || 'PROD';
const DB_NAME = 'cc2018';
const DB_URL = util_1.format('%s://%s:%s@%s/', process.env['DB_PROTOCOL'], process.env['DB_USER'], process.env['DB_USERPW'], process.env['DB_URL']);
const SVC_PORT = process.env.MAZE_SVC_PORT || 8080;
// general constant values
const COL_NAME = 'mazes';
const SVC_NAME = 'maze-service';
// create express references
const app = express_1.default();
let httpServer; // will be set with app.listen
let mongoDBClient; // set on successful connection to db
// configure pug
app.set('views', 'views');
app.set('view engine', 'pug');
// log the environment
log.info(__filename, SVC_NAME, 'Starting service with environment settings for: ' + NODE_ENV);
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
    httpServer = app.listen(SVC_PORT, function () {
        log.info(__filename, SVC_NAME, 'Listening on port ' + SVC_PORT);
        // allow CORS for this application
        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
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
                    // send the first matching maze doc
                    try {
                        res.status(200).json(docs[0]);
                    }
                    catch (_a) {
                        res.status(500).json({ 'status': 'Unable to load maze from JSON.', 'data': JSON.stringify(docs[0]) });
                    }
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
            // finds all mazes, but only returns basic maze key information
            col.find({}, { fields: { _id: 0, id: 1, height: 1, width: 1, seed: 1 } }).toArray((err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).json({ 'status': util_1.format('Error finding getting mazes from "%s": %s', COL_NAME, err.message) });
                }
                // if no match found, generate a new maze from the given values
                if (docs.length == 0) {
                    log.debug(__filename, req.path, util_1.format('No mazes found in collection %s', COL_NAME));
                    res.status(404).json({ 'status': util_1.format('No mazes found in collectoin %s', COL_NAME) });
                }
                else {
                    // match was found in the database return it as json
                    log.debug(__filename, req.path, util_1.format('%d mazes found in %s, returning JSON ...', docs.length, COL_NAME));
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
                    res.status(200).json(mazes);
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
                    log.warn(__filename, req.path, util_1.format('%d maze(s) found with id "%s", aborting.', docs.length, mazeId));
                    return res.status(400).json({ 'status': util_1.format('Maze "%s" already exists.', mazeId) });
                }
                // if no match found, generate a new maze from the given values
                log.debug(__filename, req.path, util_1.format('Generating maze "%s"...', mazeId));
                // error handling and input checks are in the Maze class - descriptive error will be returned 
                try {
                    let maze = new cc2018_ts_lib_1.Maze().generate(req.params.height, req.params.width, req.params.seed);
                    log.debug(__filename, req.path, util_1.format('Maze "%s" generated.  Storing...', mazeId));
                    col.insert(maze);
                    log.debug(__filename, req.path, util_1.format('Returning Maze "%s" as JSON...', mazeId));
                    res.status(200).json(maze);
                }
                catch (error) {
                    log.error(__filename, req.path, util_1.format('Error during maze generation: %s', error.message));
                    res.status(500).json({ 'status': util_1.format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, error.message) });
                }
            });
        });
        app.get('/generate/:mazeId', (req, res) => {
            log.debug(__filename, req.url, 'Attempting to parse and redirect single mazeId parameter for /generate.');
            try {
                let mazeId = req.params.mazeId;
                let mazeIdParts = mazeId.split(':');
                let newUrl = util_1.format('/generate/%d/%d/%s', parseInt(mazeIdParts[0]), parseInt(mazeIdParts[1]), mazeIdParts[2]);
                return res.redirect(newUrl);
            }
            catch (err) {
                return res.status(400).json({ 'status': 'Unable to parse URL.  Expected format: /generate/HEIGHT/WIDTH/SEED' });
            }
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
                res.status(200).json({ 'status': 'ok', 'count': results.deletedCount });
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