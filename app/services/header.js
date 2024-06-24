/* 
 * HEADER SERVICE
 * 
 * This service exists to store the state of the visibility of the header and
 * the header bottom (aka search bar). . 
 *  
 */

import Service from '@ember/service';
import { computed } from '@ember/object';

export default Service.extend({
  headerShown: true,
  
  /*
   * The headerBottom is the search bar headerBottomShown is set either when the
   * header is toggled using the toggleHeaderBottom() action below or in logic in the 
   * setupController or willTransition methods of the routes that use a search bar.  
   * 
   */
  headerBottomShown: false,
  headerBottomShownClass: computed('headerBottomShown', function () {
    return this.headerBottomShown == true ? 'header-bottom-wrap-shown' : '';
  }),
  hideHeader: function () {
    this.set('headerShown', false);
  },
  showHeader: function () {
    this.set('headerShown', true);
  },
  toggleHeaderBottom: function () {
    if (this.headerBottomShown) {
      this.set('headerBottomShown', false);
    } else {
      this.set('headerBottomShown', true);
    }
  },
});
