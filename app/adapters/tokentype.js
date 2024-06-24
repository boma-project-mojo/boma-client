import { inject as service } from '@ember/service';
// import { assert } from '@ember/debug';
// import { isEmpty } from '@ember/utils';
import { Adapter } from 'ember-pouch';
// import PouchDB from 'pouchdb';

export default Adapter.extend({
  init() {
    this._super(...arguments);
    let db = this.pouchDb.createDb();
    this.set('db', db);
  },
  pouchDb: service('pouch-db'),
});
