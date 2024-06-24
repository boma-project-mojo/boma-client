import Controller from '@ember/controller';
import $ from 'jquery';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { later } from '@ember/runloop';
import { computed } from '@ember/object';
import config from '../config/environment';

export default Controller.extend({
  state: service(),
  pouchDb: service('pouch-db'),
  router: service(),
  // If true the initialisation of data has been completed and users can proceed to the next stage.  
  initialisationComplete: alias('pouchDb.initialisationComplete'),
  waitingForInitialisationThenTransition: false,
  // If true there has been an error with data initialisation and we allow users to proceed regardless as data will arrive later and the
  // app looks broken if we make them wait.  
  canSkipInitialisation: alias('pouchDb.canSkipInitialisation'),

  queryParams: ['type'],

  // Get the current app model (community or festival)
  appMode: computed('model', function () {
    let appMode = this.pouchDb.calculateFestivalMode(this.model);
    return appMode;
  }),

  // Calculate the appropriate transition method to use based on the 
  // config and app mode.  
  welcomeTransitionAction: computed('appMode', 'config', function () {
    var transitionAction;
    // if there is a default festival
      // check the app mode and
        // if community
          // transition to articles
        // else if festival
          // transition to events
    // else
      // transition to the festivals index
    if (config.festivalId) {
      if (this.appMode === 'community') {
        transitionAction = 'transitionToArticles';
      } else if (this.appMode === 'festival') {
        transitionAction = 'transitionToEvents';
      }
    } else {
      transitionAction = 'transitionToFestivals';
    }
    return transitionAction;
  }),
  // Calculate the appropriate transition params to use based on the 
  // config and app mode.  
  welcomeTransitionParams: computed('appMode', 'config', function () {
    var params;
    if (this.appMode === 'community') {
      params = config.communityHome.params;
    } else if (this.appMode === 'festival') {
      params = config.festivalHome.params;
    }
    return params;
  }),

  /* 
   * waitForInitialisationThenTransition()
   *
   * This function is called when a user clicks the button to proceed from a splash screen.  
   * It only allows users to proceed once the initialisation of data has been completed or
   * the user can skip init (because of an error) 
   * 
   * @target      string      The name of the route to transition to.  
   * @params      object      The route params
   */
  waitForInitialisationThenTransition(target, params) {
    var self = this;

    this.set('waitingForInitialisationThenTransition', true);

    if (
      this.initialisationComplete === true ||
      this.canSkipInitialisation === true
    ) {
      $('body').addClass('is-transitioning');

      console.timeEnd('Wait for initialisation');

      setTimeout(function () {
        if (params) {
          self.router.transitionTo(target, { queryParams: params });
        } else {
          self.router.transitionTo(target);
        }
      }, 100);

      setTimeout(function () {
        $('body').removeClass('is-transitioning');
      }, 1000);
    } else {
      this.tick(target, params);
    }
  },
  /* 
   * tick()
   *
   * Set a timeout to try and run the transition again.  
   * This function will have been called as we need to wait for the data to complete initialisation.  
   * 
   * @target      string      The name of the route to transition to.  
   * @params      object      The route params
   */
  tick(target, params) {
    return later(
      this,
      function () {
        this.waitForInitialisationThenTransition(target, params);
      },
      400,
    );
  },

  actions: {
    /* 
     * transitionToEvents()
     *
     * Handle the action to transition to the events route.  
     * 
     * @params      object      Query params to be passed to the route.  
     */
    transitionToEvents: function (params) {
      var self = this;

      console.time('Wait before initialisation');

      // Set the local storage item so that the splash screen is only seen
      // on the first loading of the this major app version.  
      localStorage.setItem(
        `hasLoadedBefore-${this.type}-${this.state.majorAppVersion}`,
        'true',
      );

      // Trigger the loading animation.  
      $('#welcome').addClass('welcome-show-loading');

      // Wait for the animation to complete and then trigger waitForInitialisationThenTransition
      setTimeout(function () {
        self.waitForInitialisationThenTransition('events', params);
      }, 200);
    },
    /* 
     * transitionToArticles()
     *
     * Handle the action to transition to the articles route.  
     * 
     * @params      object      Query params to be passed to the route.  
     */
    transitionToArticles: function (params) {
      var self = this;

      console.time('Wait before initialisation');

      // Set the local storage item so that this splash screen type is only seen
      // on the first loading of the this major app version.  
      localStorage.setItem(
        `hasLoadedBefore-${this.type}-${this.state.majorAppVersion}`,
        'true',
      );

      // Trigger the loading animation.  
      $('#welcome').addClass('welcome-show-loading');

      // Wait for the animation to complete and then trigger waitForInitialisationThenTransition
      setTimeout(function () {
        self.waitForInitialisationThenTransition('articles', params);
      }, 200);
    },
    /* 
     * transitionToFestivals()
     *
     * Handle the action to transition to the festivals route.  
     */
    transitionToFestivals: function () {
      var self = this;

      // Set the local storage item so that this splash screen type is only seen
      // on the first loading of the this major app version.  
      localStorage.setItem(`hasLoadedBefore-${this.type}-${this.state.majorAppVersion}`, 'true');

      // Trigger the loading animation.  
      $('#welcome').addClass('welcome-show-loading');

      // Wait for the animation to complete and then trigger waitForInitialisationThenTransition
      setTimeout(function () {
        self.waitForInitialisationThenTransition('festivals');
      }, 200);
    },
    /* 
     * goToRoute()
     *
     * Handle the action to transition to the route name provided route.  
     */
    goToRoute: function (route, queryParams = {}) {
      // Set the local storage item so that this splash screen type is only seen
      // on the first loading of the this major app version.  
      localStorage.setItem(`hasLoadedBefore-${this.type}-${this.state.majorAppVersion}`, 'true');

      var self = this;

      $('body').addClass('is-transitioning');

      // Wait for the animation to complete and then trigger waitForInitialisationThenTransition
      setTimeout(function () {
        self.router.transitionTo('community-events', {
          queryParams: queryParams,
        });
        $('body').removeClass('is-transitioning');
      }, 200);
    },
  },
});
