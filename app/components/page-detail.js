import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import AnimateModal from '../mixins/animate-modal';

export default Component.extend(AnimateModal, {
  store: service('store'),
  init() {
    this.set('page', this.store.peekRecord('page', this.pageID));
    this._super(...arguments);
  },
});
