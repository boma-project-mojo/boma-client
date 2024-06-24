/* 

Is Preferred Mixin

A mixin to provide a function to check whether a model is included in this users preferences.

*/

import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';

export default Mixin.create({
  isPreferred: computed('id', 'preference', 'store', function () {
    var self = this;
    var preferenceEventIds = [];
    this.store.peekAll('preference').filter(function (preference) {
      preferenceEventIds.push(
        preference.get(`${self.constructor.modelName}_id`),
      );
    });
    return preferenceEventIds.includes(this.id);
  }),
});
