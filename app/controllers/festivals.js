import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import ENV from 'boma/config/environment';

export default Controller.extend({
  pouchDb: service('pouchDb'),
  router: service(),
  isLoading: false,

  animations: service(),

  actions: {
    /* 
     * goToRoute()
     *
     * Trigger the route animations and navigate to a route.  
     * 
     * route        str       The route name to transition to
     * queryParmas  obj       Query params to pass to the route
     */
    async goToRoute(route, queryParams = {}) {
      var self = this;
      try {
        await self.router.transitionTo(route, queryParams);
      } catch (e) {
        console.log(e);
      }
      // wait a few milliseconds
      await this.animations.delay(150);
      // Hide the loading splash screen
      await this.animations.hideSplash();
    },
    /* 
     * chooseFestival()
     *
     * Change the festival currently being viewed in the app.   
     * 
     * festival        Ember Data Object       The festival to change to.  
     * 
     * TODO:  DRY up with app-left-sidebar.js
     */    
    async chooseFestival(festival) {
      // Close the sidebar
      this.set('isLoading', true);

      // Show the splash screen
      await this.animations.showSplash(
        'Loading festival data. <br> Please wait.',
        true,
      );

      // Change festival and trigger preload, when complete go to route.
      await this.pouchDb.changeFestival(festival);
      await this.pouchDb.preloadFestival(festival);

      // Once preload is complete transition to the festivalHome route
      this.send('goToRoute', ENV['festivalHome'].routeName, {
        queryParams: ENV['festivalHome'].params,
      });
    },
    /* 
     * reload()
     *
     * Reload the routes model.
     */    
    reload: function () {
      this.send('reloadModel');
    },
  },
});
