import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import $ from 'jquery';
import ReportActivity from '../mixins/report-activity';
import AnimateModal from '../mixins/animate-modal';

export default Component.extend(ReportActivity, AnimateModal, {
  eventFilterTagType: ENV['eventFilterTagType'],
  store: service('store'),
  init() {
    this._super(...arguments);
    if (this.productionID) {
      this.set(
        'production',
        this.store.peekRecord('production', this.productionID),
      );
    }
  },
  didInsertElement() {
    this._super(...arguments);
    // If this production hasn't been loaded into the route model 
    // fallback to loading it now.  
    if (!this.production) {
      this.store
        .findRecord('production', this.productionID)
        .then((production) => {
          this.set('production', production);
        });
    }
  },
  didReceiveAttrs() {
    $('#full-page-modal').scrollTop(0, 0);
    // If this production hasn't been loaded into the route model 
    // fallback to loading it now.  
    if (this.productionID) {
      this.set(
        'production',
        this.store.peekRecord('production', this.productionID),
      );
    }
    this._super(...arguments);
  },
});
