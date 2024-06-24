import { inject as service } from '@ember/service';
import { Adapter } from 'ember-pouch';

export default Adapter.extend({
  pouchDb: service(),
  init() {
    let currentDBName = localStorage.getItem('currentDb');
    this._super(...arguments);
    let db = this.pouchDb.createDb(currentDBName);
    this.set('db', db);
  },
});
