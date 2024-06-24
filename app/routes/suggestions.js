import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { alias } from '@ember/object/computed';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  pouchDb: service('pouch-db'),
  currentFestivalID: alias('pouchDb.currentFestivalID'),
  model() {
    return hash({
      wallet: this.tokenService.getWallet(),
      festival: this.store.findRecord('festival', this.currentFestivalID)
    });
  },
});
