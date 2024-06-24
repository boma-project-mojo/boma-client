/* 

Go To Route Mixin

This mixin provides actions that handle the animation of route transitions. 

*/

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';

export default Mixin.create({
  router: service(),
  actions: {
    /* 
     * goToRoute()
     *
     * Animate the transition to a route..  
     * 
     * @route           str       Name of route to transition to
     * @queryParams     object    Query params to pass to the route
     */
    goToRoute(route, queryParams = {}) {
      var self = this;
      setTimeout(function () {
        self.router.transitionTo(route, { queryParams: queryParams });
      }, 250);
    },
  },
});
