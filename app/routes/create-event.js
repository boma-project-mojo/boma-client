import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  formService: service('form'),
  model() {
    return hash({
      wallet: this.tokenService.getWallet(),
      tokens: this.store.query('token2', { filter: { aasm_state: 'mined' } }),
    });
  },
  setupController(controller, model) {
    controller.set('formSubmitted', false);
    this.formService.resetForm();

    controller.setProperties({
      event: {
        image_base64: null,
        name: null,
        description: null,
        venue: {},
        start_time: null,
        end_time: null,
        selectedVenue: null,
        external_link: null,
        editingAddress: false,
        mapOpen: false,
        event_format: 'physical',
        event_type: 'community_event',
        wallet_address: model.wallet.address,
      },
      formSubmitted: null,
      uncroppedImage: null,
    });

    this._super(controller, model);
  },
});
