import { Adapter } from 'ember-pouch';
import { inject as service } from '@ember/service';

export default Adapter.extend({
  init() {
    let currentDBName = localStorage.getItem('currentDb');
    this._super(...arguments);
    let db = this.pouchDb.createDb(currentDBName);
    this.set('db', db);
  },
  pouchDb: service('pouch-db'),
});
