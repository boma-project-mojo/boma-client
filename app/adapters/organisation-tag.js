import { Adapter } from 'ember-pouch';
import { inject as service } from '@ember/service';

export default Adapter.extend({
  init() {
    this._super(...arguments);
    let db = this.pouchDb.createDb();
    this.set('db', db);
  },
  pouchDb: service('pouch-db'),
});
