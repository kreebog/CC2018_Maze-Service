import path from 'path';
import { Maze } from './Maze'
import { format } from 'util';
import * as log from './Logger';
import express from 'express';
import { MongoClient } from 'mongodb';

// constant value references
const DB_URL = 'mongodb+srv://mdbuser:cc2018-mdbpw@cluster0-bxvkt.mongodb.net/';
const DB_NAME = 'cc2018';
const COL_NAME = 'mazes';
const APP_PORT = 8080;

// constant object references
const app = express();
app.set('views', 'views');
app.set('view engine', 'pug');

// configure modules
log.setLogLevel(log.LOG_LEVELS.INFO);

// only start the web service after connecting to the database
MongoClient.connect(DB_URL + DB_NAME, function(err, client) {
    if (err) {
        log.error(__filename, '', JSON.stringify(err));
        return err;
    }

    // get the cc2018 database and the mazes collection
    let db = client.db(DB_NAME);
    let col = db.collection(COL_NAME);

    // all is well, listen for connections
    app.listen(APP_PORT, function() {
        log.info(__filename, '', format('Listening on port %d', APP_PORT));

        // gets maze with the given id (combination of height:width:seed)
        app.get('/get/:height/:width/:seed', (req, res) => {

            let mazeId = format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);

            // search the collection for a maze with the right id
            let cursor = col.find({id:mazeId}).toArray( (err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).send({'status':format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message)});
                }

                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 1) {
                    log.warn(__filename, req.path, format('%d mazes found with id "%s", returning first match.', docs.length, mazeId));
                }

                // if no match found, generate a new maze from the given values
                if (docs.length == 0) {
                    log.debug(__filename, req.path, format('Maze "%s" not found.', mazeId));
                    res.status(404).send({'status': format('Maze "%s" not found.', mazeId)});
                } else {
                    // match was found in the database return it as json
                    log.debug(__filename, req.path, format('Maze "%s" found, return as JSON...', mazeId));

                    // TODO: Marshalling to and from Maze type is not needed here
                    // Leaving it for now as an example, as it may be useful elsewhere
                    let lMaze = new Maze().loadFromJSON(JSON.stringify(docs[0]));
                    res.status(200).send(JSON.stringify(docs[0]));
                }
            });
        });

        // gets maze with the given id (combination of height:width:seed)
        app.get('/generate/:height/:width/:seed', (req, res) => {

            let mazeId = format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);

            // search the collection for a maze with the right id
            let cursor = col.find({id:mazeId}).toArray( (err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).send({'status':format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message)});
                }

                // warn if there are duplicates - we'll only work with the first record found
                if (docs.length > 0) {
                    log.warn(__filename, req.path, format('%d mazes found with id "%s", aborting.', docs.length, mazeId));
                    return res.status(400).send({'status': format('Maze "%s" already exists.', mazeId)});
                }

                // if no match found, generate a new maze from the given values
                log.debug(__filename, req.path, format('Generating maze "%s"...', mazeId));

                // error handling and input checks are in the Maze class - descriptive error will be returned 
                try {
                    let maze = new Maze().generate(req.params.height, req.params.width, req.params.seed);
                    log.debug(__filename, req.path, format('Maze "%s" generated.  Storing...', mazeId));
                    col.insert(maze);

                    log.debug(__filename, req.path, format('Returning Maze "%s" as JSON...', mazeId));
                    res.status(200).send(JSON.stringify(maze));
                } catch (error) {
                    log.error(__filename, req.path, format('Error during maze generation: %s', error.message));
                    res.status(500).send({'status':format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, error.message)});
                }
            });
        });

        /**
         * Lists all mazes currently in the database
         * TODO: Page this?  It might get long...
         */
        app.get('/list', (req, res) => {
            let cursor = col.find({}).toArray( (err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).send({'status':format('Error getting all documents from "%s": %s', COL_NAME, err.message)});
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

            let mazeId = format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            
            let cursor = col.find({id:mazeId}).toArray( (err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).send({'status':format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message)});
                }

                if (docs.length > 1) {
                    log.warn(__filename, req.path, format('%d mazes found with id "', docs.length, mazeId));
                }

                if (docs.length == 0) {
                    log.debug(__filename, req.path, format('No maze with id %s found.', mazeId));
                    return res.status(404).send({'status': format('Maze "%s%" not found.', mazeId)});
                } else {
                    log.debug(__filename, req.path, format('Maze "%s" found in DB, viewing...', mazeId));
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

            let mazeId = format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            
            // delete the first document with the matching mazeId
            col.deleteOne({id: mazeId}, function (err, results) {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    return res.status(500).send({'status':format('Error finding "%s" in "%s": %s', mazeId, COL_NAME, err.message)});
                }

                // send the result code with deleted doc count
                res.status(200).send({'deleted_count': results.deletedCount});
                log.info(__filename, req.path, format('%d document(s) deleted', results.deletedCount));
                
            });
        });

        /**
         * Handle favicon requests - using the BCBST favicon.ico
         */
        app.get('/favicon.ico', (req, res) => {
            res.status(200).sendFile(path.resolve('views/favicon.ico'));
        });

        /**
         * Misrouted traffic catch-all
         */
        app.get('/*', (req, res) => {
            log.debug(__filename, req.path, 'Invalid path in URL.');
            res.render('index', {
                responseCode: 404,
                sampleGet: format('http://%s/GET/10/15/SimpleSample', req.headers.host),
                sampleGenerate: format('http://%s/GENERATE/10/15/SimpleSample', req.headers.host),
                sampleDelete: format('http://%s/DELETE/10/15/SimpleSample', req.headers.host),
                sampleView: format('http://%s/VIEW/10/15/SimpleSample', req.headers.host),
                sampleList: format('http://%s/LIST', req.headers.host),
            });
        });
    });
});