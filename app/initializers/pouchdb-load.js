import PouchDB from 'pouchdb-core';
import PouchDBFind from 'pouchdb-find';
import PouchDBRelational from 'relational-pouch';
import idb from 'pouchdb-adapter-idb';
import HttpPouch from 'pouchdb-adapter-http';
import mapreduce from 'pouchdb-mapreduce';
import replication from 'pouchdb-replication';
import PouchDBLoad from 'pouchdb-load';

// For v7.0.0 and newer you must first load the 'pouchdb-debug' plugin
// see https://github.com/pouchdb/pouchdb/tree/39ac9a7a1f582cf7a8d91c6bf9caa936632283a6/packages/node_modules/pouchdb-debug
// import pouchDebugPlugin from 'pouchdb-debug'; // (assumed available via ember-auto-import or shim)
// PouchDB.plugin(pouchDebugPlugin);

// PouchDB.debug.enable('*');

export function initialize() {
  PouchDB.plugin(PouchDBFind)
    .plugin(PouchDBRelational)
    .plugin(idb)
    .plugin(HttpPouch)
    .plugin(mapreduce)
    .plugin(PouchDBLoad)
    .plugin(replication);
}

export default {
  name: 'pouchdbLoad',
  initialize,
};
