/* 

Is data loading mixin

A mixin to provide the animation state for the loading UI in the app header.  

*/

import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';

export default Mixin.create({
  isLoadingModel: false,
  isRetryingNowClass: computed('isLoadingModel', function () {
    return this.isLoadingModel ? 'fa-spin' : '';
  }),
});
