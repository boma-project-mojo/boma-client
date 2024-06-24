import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import ENV from 'boma/config/environment';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  formService: service('form'),
  model() {
    return hash({
      wallet: this.tokenService.getWallet(),
      tokens: this.store.query('token2', { filter: { aasm_state: 'mined' } }),
      tags: this.store.findAll('organisation-tag'),
      backgroundImages: $.getJSON('assets/json/editor-images.json'),
    });
  },
  setupController(controller, model) {
    controller.set('formSubmitted', false);
    this.formService.resetForm();

    controller.setProperties({
      article: {
        tag: null,
        external_link: null,
        content: null,
        filename: null,
        filetype: null,
        image_base64: null,
        festival_id: ENV['festivalId'],
        article_type: 'community_article',
      },
      image_base64: null,
      formSubmitted: null,
      selectedTag: null,
    });

    this._super(controller, model);
  },
});
