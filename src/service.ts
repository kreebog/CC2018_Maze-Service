import express from 'express';
import { MongoClient } from 'mongodb';

import util from 'util';
import * as log from './Logger';
import fs from 'fs';
import { Maze } from './Maze';

let AppInfo = JSON.parse(fs.readFileSync('package.json', 'utf8'));

log.setLogLevel(log.LOG_LEVELS.TRACE);
log.info(__filename, '', util.format('Starting %s v%s in %s', AppInfo.name, AppInfo.version, __dirname));

let dbUrl = 'mongodb://mongodb-code-camp-2018.a3c1.starter-us-west-1.openshiftapps.com';
log.info(__filename, '', util.format('Connecting to database (%s)', dbUrl));

MongoClient.connect(dbUrl, function(err, db) {
    if (err) throw err;
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


