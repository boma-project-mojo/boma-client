import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  formService: service('form'),
  elementId: 'form-wrap',
  didInsertElement() {
    this._super(...arguments);
    this.formService.initializeFlickity(this.elementId);
  },
});
