import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  model(params) {
    return hash({
      tokentypes: this.store.findAll('tokentype'),
      wallet: this.tokenService.getWallet(),
      tokens: this.store.query('token2', { filter: { aasm_state: 'mined' } }),
      token: this.store.findRecord('token2', params['token_id']),
    });
  },
  setupController(controller, model) {
    this._super(controller, model);
  },
});
