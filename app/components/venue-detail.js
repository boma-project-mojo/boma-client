import { inject as service } from '@ember/service';
import Component from '@ember/component';
import $ from 'jquery';
import AnimateModal from '../mixins/animate-modal';

export default Component.extend(AnimateModal, {
  store: service('store'),
  init() {
    this.set('venue', this.store.peekRecord('venue', this.venueID));
    this._super(...arguments);
  },
  didInsertElement() {
    this._super(...arguments);
    $('#full-page-modal').scrollTop(0, 0);
  },
});
