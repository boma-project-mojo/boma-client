import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import ReportActivity from '../mixins/report-activity';
import AnimateModal from '../mixins/animate-modal';

export default Component.extend(ReportActivity, AnimateModal, {
  classNameBindings: ['pageName', 'articleType'],

  store: service('store'),
  placeholderHidden: '',
  init() {
    this._super(...arguments);
    // Get the ember data record for this articleID
    let article = this.store.peekRecord('article', this.articleID);
    this.set('article', article);
  },
  didInsertElement() {
    this._super(...arguments);
    // If this article isn't available then close the modal.  
    if (!this.article) {
      this.closeModal();
    }
  },
});
