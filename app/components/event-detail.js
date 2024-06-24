import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import $ from 'jquery';
import { computed } from '@ember/object';
import ReportActivity from '../mixins/report-activity';
import AnimateModal from '../mixins/animate-modal';

export default Component.extend(ReportActivity, AnimateModal, {
  eventFilterTagType: ENV['eventFilterTagType'],
  store: service('store'),
  router: service('router'),
  // Used for live streams to only display the audio player component when the live stream is available.
  eventIsLive: computed('event.{start_time,end_time}', function () {
    var startDiff = moment(this.event.start_time).diff(moment(), 'minutes');
    var endDiff = moment(this.event.end_time).diff(moment(), 'minutes');

    return startDiff <= 0 && endDiff >= 0;
  }),
  // Used for live streams to display a start time of the stream before it commences.
  eventIsInFuture: computed('event.start_time', function () {
    var diff = moment(this.event.start_time).diff(moment(), 'minutes');
    return diff > 0;
  }),
  init() {
    this._super(...arguments);
    if (this.eventId) {
      this.set('event', this.store.peekRecord('event', this.eventId));
    }
  },
  didInsertElement() {
    this._super(...arguments);
    // If event is not loaded into the route's model then load it from 
    // the ember data store.  
    if (!this.event) {
      this.store.findRecord('event', this.eventId).then((event) => {
        this.set('event', event);
      });
    }
  },
  didReceiveAttrs() {
    $('#full-page-modal').scrollTop(0, 0);
    this._super(...arguments);
  }
});
