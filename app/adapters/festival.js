import { inject as service } from '@ember/service';
import { Adapter } from 'ember-pouch';

export default Adapter.extend({
  pouchDb: service(),
  init() {
    this._super(...arguments);
    let db = this.pouchDb.createDb();
    this.set('db', db);
  },
});
