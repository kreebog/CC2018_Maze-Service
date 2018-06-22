import path from 'path';
import { Maze } from './Maze'
import { format } from 'util';
import * as log from './Logger';
import express from 'express';
import { MongoClient } from 'mongodb';
import { request } from 'https';

// constant value references
const DB_URL = 'mongodb+srv://mdbuser:cc2018-mdbpw@cluster0-bxvkt.mongodb.net/';
const DB_NAME = 'cc2018';
const COL_NAME = 'mazes';
const APP_PORT = 8080;

// constant object references
const app = express();

// configure modules
log.setLogLevel(log.LOG_LEVELS.DEBUG);

MongoClient.connect(DB_URL + DB_NAME, function(err, client) {
    if (err) {
        log.error(__filename, '', JSON.stringify(err));
        return err;
    }

    let db = client.db(DB_NAME);
    let col = db.collection(COL_NAME);

    app.listen(APP_PORT, function() {
        log.info(__filename, '', format('Listening on port %d', APP_PORT));

        app.get('/:height/:width/:seed', (req, res) => {

            let mazeId = format('%d:%d:%s', req.params.height, req.params.width, req.params.seed);
            
            let cursor = col.find({id:mazeId}).toArray( (err, docs) => {
                if (err) {
                    log.error(__filename, req.path, JSON.stringify(err));
                    res.status(500).send('Unable to complete request.');
                }

                if (docs.length > 1) {
                    log.warn(__filename, req.path, format('%d mazes found with id "', docs.length, mazeId));
                }

                if (docs.length == 0) {
                    log.debug(__filename, req.path, format('Maze "%s" not found.  Generating...', mazeId));

                    try {
                        let maze = new Maze().generate(req.params.height, req.params.width, req.params.seed);
                        log.debug(__filename, req.path, format('Maze "%s" generated.  Storing...', mazeId));
                        col.insert(maze);
    
                        log.debug(__filename, req.path, format('Returning Maze "%s" as JSON...', mazeId));
                        res.status(200).send(JSON.stringify(maze));
                    } catch (error) {
                        log.error(__filename, req.path, format('Error during maze generation: %s', error.message));
                        res.status(400).sendFile(path.resolve('views/error.html'));
                    }

                } else {
                    log.debug(__filename, req.path, format('Maze "%s" found in DB, return as JSON...', mazeId));
                    let lMaze = new Maze().loadFromJSON(JSON.stringify(docs[0]));
                    res.status(200).send(JSON.stringify(docs[0]));
                }
            });
        });

        app.get('/favicon.ico', (req, res) => {
            res.status(200).sendFile(path.resolve('favicon.ico'));
        });

        app.get('/*', (req, res) => {
            log.debug(__filename, req.path, 'Invalid path in URL.');
            res.status(404).sendFile(path.resolve('views/index.html'));
        });
    });
});