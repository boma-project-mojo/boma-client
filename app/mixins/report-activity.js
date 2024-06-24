/* 

Report Activity Mixin

Report the action of viewing a modal for a model.  

*/

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';

export default Mixin.create({
  activity: service('activity'),
  didInsertElement() {
    this._super(...arguments);
    if (this.articleID) {
      this.activity.recordActivity('view', 'article', this.article);
    } else if (this.eventId) {
      // Glue code for legacy event data as subsequent logging broken
      // if event_type is null
      if (this.event) {
        var tempEvent = this.event;
        if (this.event.event_type === null) {
          tempEvent.set('event_type', 'boma_event');
        }
        this.activity.recordActivity('view', 'event', tempEvent);
      }
    } else if (this.productionID) {
      if (this.production) {
        this.activity.recordActivity('view', 'production', this.production);
      }
    }
  },
});
