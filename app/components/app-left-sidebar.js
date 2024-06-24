import { scheduleOnce } from '@ember/runloop';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import $ from 'jquery';
import { computed } from '@ember/object';
import ENV from 'boma/config/environment';
import { alias } from '@ember/object/computed';
import { sort } from '@ember/object/computed';

export default Component.extend({
  classNames: ['left-sidebar'],
  classNameBindings: ['appTypeClass'],

  router: service(),
  logger: service(),
  pouchDb: service('pouch-db'),
  store: service('store'),
  audioPlayer: service('audio-player'),
  
  /* 
   * isBetaTester
   * 
   * Users who have a token which includes the word 'testers'
   * are shown festivals in the 'preview' state on a multi festival app.  
   */
  isBetaTester: computed('tokens', function () {
    var isBetaTester = false;
    var betaTesterTokens = this.tokens.filter((token) => {
      if (token.event_name.toLowerCase().search('testers') != -1) {
        return token;
      }
    });

    if (betaTesterTokens.length > 0) {
      isBetaTester = true;
    }
    return isBetaTester;
  }),

  subtleWallet: ENV['subtleWallet'],

  isOpen: false,
  leftSidebarClass: false,

  audioTagID: ENV['articleAudioTagId'],
  multiFestivalApp: ENV['multiFestivalApp'],
  currentMediaModelID: alias('audioPlayer.currentMediaModelID'),
  currentMediaModelName: alias('audioPlayer.currentMediaModelName'),
  currentMediaIsPlaying: alias('audioPlayer.currentMediaIsPlaying'),
  audio_id_as_array: computed('audioTagID', function () {
    return [String(this.audioTagID)];
  }),

  /* 
   * appTypeClass
   * 
   * If a multi festival app this class is used to reduce the width of 
   * the links part of the sidebar to make room for the UX to change festival
   */
  appTypeClass: computed('multiFestivalApp', function () {
    var appTypeClass;
    if (this.multiFestivalApp === true) {
      appTypeClass = 'multi-festival-app';
    } else {
      appTypeClass = 'single-festival-app';
    }
    return appTypeClass;
  }),

  /* 
   * sortedFestivals
   * 
   * return festivals sorted by the list order ascending
   */
  sortedFestivals: sort('festivals', function (a, b) {
    // default list_order is 0, festivals without a list_order should be
    // displayed at the end.  
    if (a.list_order === 0) {
      return -1000;
    } else if (a.list_order > b.list_order) {
      return 1;
    } else if (a.list_order < b.list_order) {
      return -1;
    }
  }),

  currentFestivalName: alias('pouchDb.currentFestivalDbName'), // Used for showing active festival in sidebar in multi festival app mode
  currentFestivalID: alias('pouchDb.currentFestivalID'),

  animations: service(),

  /* 
  Handle the Android back button.  When modal's are open close modal.  

  This is instantiated here because it needs to be run via didInsertElement so the event can be 
  bound to the 'document' DOM element.  

  This prevents the scroll being returned to now when using the back button to return from modal.  
  */
  handleBackButton(event) {
    if (
      window.router &&
      (window.router.currentRoute.queryParams.productionModal === 'true' ||
        window.router.currentRoute.queryParams.articleModal === 'true' ||
        window.router.currentRoute.queryParams.eventModal === 'true' ||
        window.router.currentRoute.queryParams.venueModal === 'true' ||
        window.router.currentRoute.queryParams.pageModal === 'true')
    ) {
      event.preventDefault();
      // Close the modal
      window.self.closeModal();
      // Remove the modal from the history stack unless on clashfinder view (as this forces the canvases to rerender triggering scrollToNow)
      if (window.router.currentRoute.queryParams.viewType != 'clashfinder') {
        window.history.back();
      }
    } else {
      // Don't go back from clashfinder view as this causes modal to reopen because it hasn't been removed from the history stack above.  
      if (window.router.currentRoute.queryParams.viewType != 'clashfinder') {
        window.history.back();
      }
    }
  },

  didInsertElement() {
    this._super(...arguments);

    var padding;
    if (this.multiFestivalApp === true) {
      padding = 322;
    } else {
      padding = 256;
    }

    // eslint-disable-next-line ember/no-incorrect-calls-with-inline-anonymous-functions
    scheduleOnce('afterRender', this, function () {
      // Instantiate the Slideout plugin used to toggle the menu.  
      var leftSidebar = new Slideout({
        panel: $('#main-outlet-wrapper')[0],
        menu: $('.left-sidebar')[0],
        padding: padding,
        tolerance: 10,
        touch: true,
      });

      function close(eve) {
        eve.preventDefault();
        leftSidebar.close();
      }

      leftSidebar
        .on('beforeopen', function () {
          this.panel.classList.add('panel-open');
        })
        .on('open', function () {
          this.panel.addEventListener('click', close);
        })
        .on('beforeclose', function () {
          this.panel.classList.remove('panel-open');
          this.panel.removeEventListener('click', close);
        });

      $('body').on('click', '#toggle-left-sidebar', function () {
        leftSidebar.toggle();
      });

      let panel = document.getElementById('main-outlet-wrapper');

      panel.addEventListener(
        'touchstart',
        function (eve) {
          let offset = eve.touches[0].pageX;

          if (leftSidebar._orientation !== 1) {
            offset = window.innerWidth - offset;
          }

          leftSidebar._preventOpen =
            leftSidebar._preventOpen ||
            (offset > leftSidebar._tolerance && !leftSidebar.isOpen());
        },
        { passive: true },
      );

      this.set('leftSidebarClass', leftSidebar);

      $('.left-sidebar').on('click', '.toggle-submenu', function (event) {
        $(event.target).parent().next().toggleClass('shown');
      });
    });

    /*
    Handle Back Button on Android

    If modal is open it should 
    */
    document.addEventListener('backbutton', this.handleBackButton, false);
  },
  actions: {
    /* 
     * close()
     *
     * Close the left sidebar menu  
     */
    close() {
      this.leftSidebarClass.close();
    },
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
      // Close the left sidebar
      this.leftSidebarClass.close();
      // Wait a short amount of time so the user can see the left sidebar closing
      await this.animations.delay(150);
      // Show the loading splash screen
      await this.animations.showSplash();
      // Attempt the transition
      try {
        await self.router.transitionTo(route, {
          queryParams: queryParams,
        });
      } catch (err) {
        this.logger.log(err, 'ERROR');
      }
      // If a route has changed give the app a moment to render
      if (this.router.currentRoute.name !== route) {
        await this.animations.delay(150);
      }
      // Hide the loading splash screen
      await this.animations.hideSplash();
    },
    /* 
     * changeFestival()
     *
     * Change the festival currently being viewed in the app.   
     * 
     * festival        Ember Data Object       The festival to change to.  
     */    
    async changeFestival(festival) {
      // Close the sidebar
      this.leftSidebarClass.close();

      // Show the splash screen
      await this.animations.showSplash(
        'Loading festival data. <br> Please wait.',
        true
      );

      // Change the festival and preload the events
      await this.pouchDb.changeFestival(festival);
      await this.pouchDb.preloadFestival(festival);

      // Once preload is complete transition to the festivalHome route
      this.send(
        'goToRoute',
        ENV['festivalHome'].routeName,
        ENV['festivalHome'].params,
      );
    },
  },
});
