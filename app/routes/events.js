import { hash } from 'rsvp';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import queryParamsMixin from '../mixins/query-params';
import config from 'boma/config/environment';
import handleDataRefresh from '../mixins/handle-data-refresh';
import { alias } from '@ember/object/computed';

export default Route.extend(
  queryParamsMixin,
  handleDataRefresh,
  {
    eventFilterTagType: config.eventFilterTagType,
    store: service(),
    preferenceToggle: service('preference-toggle'),
    eventsService: service('events'),
    tokenService: service('token'),
    clashfinderService: service('clashfinder'),
    headerService: service('header'),
    pouchDb: service('pouchDb'),
    festival: service('festival'),
    settings: service(),
    filter: service(),
    productionWidth: 0,
    lastUpdatedAt: false,
    hasInitialisedScroll: false,
    festivalId: alias('pouchDb.currentFestivalID'),
    queryParams: {
      selectedTags: {
        refreshModel: true,
      },
      persistentSelectedTags: {},
      selectedExcludedTags: {},
      preferences: {
        refreshModel: true,
      },
      selectedVenues: {
        refreshModel: true,
      },
      selectedDays: {
        refreshModel: true,
      },
      productionModal: {},
      productionModalModelID: {},
      eventModal: {},
      eventModalModelID: {},
      selectedCFDay: {
        // refreshModel: true
      },
      viewType: {
        refreshModel: true,
      },
      goBack: {},
      pageName: {},
      searchKeyword: {
        refreshModel: true,
      }
    },
    setupController(controller, model) {
      controller.set('isSearching', false);

      if (
        window.dataIsLoaded === true &&
        model.events.length === 0 &&
        (controller.get('preferences') === undefined ||
          controller.get('preferences') === false)
      ) {
        controller.set('noEventsFound', true);
      } else {
        controller.set('noPreferences', true);
      }
      
      // For days filter and clashfinder-nav
      controller.set('days', this.festival.festivalDays(model.festival));

      if (this.paramsFor('events').viewType === 'clashfinder') {
        // Clear filters
        controller.set('selectedTags', []);
        controller.set('persistentSelectedTags', []);
        controller.set('searchKeyword', '');
        controller.set('selectedVenues', []);
        controller.set('selectedDays', []);

        // On the first load the selectedCFDay should be set to the default go to now date.
        var defaultGoToNowDay = this.clashfinderService.calculateDefaultGoToNowDay();
        controller.set('selectedCFDay', defaultGoToNowDay);
        // Store the defaultGoToNowDay so it can be used when re-rendering canvas or when
        // a user triggers the 'CFscrollToNow' action.
        controller.set('defaultGoToNowDay', defaultGoToNowDay);

        // Search is not enabled on clashfinder view so the headerBottom should be hidden. 
        controller.set('headerBottomShown', false);
      }

      // Set scroll to 0 to avoid menu disappearing on iOS when accidentally scrolling up whilst opening
      // menu
      this.headerService.showHeader();

      // Set the modalType on the controller using the festival config.
      controller.set('modalType', model.festival.schedule_modal_type);

      this._super(controller, model);
    },

    async model(params) {
      var self = this;

      let festival = await this.store.findRecord('festival', this.festivalId);

      let events = this.eventsService.query(params, festival);

      let performanceVenues = this.store.findAll('venue').then((venues) => {
        var sortedVenues = venues.toArray().sortBy('list_order');
        return sortedVenues.filter(function (venue) {
          if (venue.get('venue_type') === 'performance') {
            return venue;
          }
        });
      });

      const tags = this.store.findAll('tag').then((all_tags) => {
        var selectedExcludedTags = params['selectedExcludedTags'] || [];
        return all_tags.filter(function (tag) {
          if (
            tag.get('aasm_state') == 'published' && //only show published tags
            tag.get('tag_type') == self.eventFilterTagType && //only show the relevant tags
            tag.get('festival_id') == self.festivalId &&
            selectedExcludedTags.includes(tag.get('id')) === false //don't show tags that are excluded from this query
          ) {
            return tag;
          }
        });
      });

      return hash({
        performanceVenues: performanceVenues,
        tags: tags,
        events: events,
        festival: festival,
        lessWordyCopy: this.settings.getSetting('less-wordy-copy'),
      });
    },
    beforeModel: function () {
      var self = this;

      this.controllerFor('application').set('isEvents', true);

      if (window.cordova !== undefined) {
        if (this.resumeEventSet !== true) {
          document.addEventListener(
            'resume',
            function () {
              // Only fire the scrollToNow event if it has been longer than 5 minutes since closing the app
              if (
                typeof window.appLastClosedAt !== 'undefined' &&
                (Date.now() - window.appLastClosedAt) / 1000 > 300
              ) {
                setTimeout(() => {
                  window.eventsController.send('scrollToNow', false);
                  window.eventsController.headerService.showHeader();
                  self.set('resumeEventSet', false);
                }, 100);
              }
            },
            false,
          );

          this.set('resumeEventSet', true);
        }
      }
      this._super(...arguments);
    },

  /* 
   * refreshData()
   *
   * isAction       boolean     if true a user action has triggered this request
   * 
   * Called in 'activate' callback by the `handleDataRefresh` mixin this function
   * requests the latest data for events from couchdb.  
   */
    refreshData(isAction) {
      var self = this;
      return new Promise(function (resolve, reject) {
        // Don't automatically reload the data on clashfinder load, it causes the route to reload which
        // reinitialises the canvas which is bad UX.
        if (
          !isAction &&
          (self.paramsFor('events').viewType === 'clashfinder' ||
            self.get('isLoadingModel') === true)
        ) {
          reject('Skipped refreshing data');
        } else {
          self.controllerFor('events').set('isLoadingModel', true);

          let isPreloaded = localStorage.getItem(
            `${self.pouchDb.currentFestivalDbName}_preloaded`,
          );

          // If the festival is pre-loaded get the updates
          if (isPreloaded === 'true') {
            self
              .performDataRefresh(
                `${localStorage.getItem(
                  'currentDb',
                )}_by_model_name_erlang/festival_dump`,
                self.controllerFor('events'),
              )
              .then(() => {
                resolve();
              });
          } else {
            // If the festival isn't pre-loaded preload it then trigger the data update.
            self.store
              .findRecord('festival', self.pouchDb.currentFestivalID)
              .then((festival) => {
                self.pouchDb.preloadFestival(festival).then(() => {
                  self
                    .performDataRefresh(
                      `${localStorage.getItem(
                        'currentDb',
                      )}_by_model_name_erlang/festival_dump`,
                      self.controllerFor('events'),
                    )
                    .then(() => {
                      resolve();
                    });
                });
              });
          }
        }
      });
    },

    firstLoad: true,

    /* 
     * stringForArray()
     *
     * convert an array to a string to allow for simple comparison.  
     * 
     * @transition  object    the ember data transition object
     * @attribute   str       name of attribute name to get array from
     */
    stringForArray(transition, attribute){
      var string =
        transition && transition.queryParams[attribute]
          ? JSON.stringify(transition.queryParams[attribute])
          : JSON.stringify([]);

      return string;
    },

    /* 
     * haveFiltersChanged()
     *
     * This method checks whether filter properties have changed between routes transitions
     * 
     * @transition      object    the ember transition object
     */
    haveFiltersChanged(transition) {
      let from = transition.from;
      let to = transition.to;

      // Check if selectedTags or persistentSelectedTags have changed between route transitions. 

      // Construct strings to represent the selectedTags for the current and incoming routes
      // to enable simple comparison.
      var fromTags = this.stringForArray(from, 'selectedTags');
      var toTags = this.stringForArray(to, 'selectedTags');

      var fromPersistentTags = this.stringForArray(
        to,
        'selectedPersistentTags',
      );
      var toPersistentTags = this.stringForArray(
        from,
        'selectedPersistentTags',
      );

      let tagsHaveChanged = fromTags != toTags || fromPersistentTags != toPersistentTags;

      // Check if preferences have changed between route transitions
      var preferencesHaveChanged = false;
      if (from) {
        preferencesHaveChanged = from.queryParams.preferences != to.queryParams.preferences;
      }

      // Check if venues have changed between route transitions
      // Construct strings to represent the selectedVenues for the current and incoming routes
      // to enable simple comparison.
      var fromVenues = this.stringForArray(from, 'selectedVenues');
      var toVenues = this.stringForArray(to, 'selectedVenues');

      let venuesHaveChanged = fromVenues != toVenues;

      return tagsHaveChanged || preferencesHaveChanged || venuesHaveChanged;
    },

    /* 
     * shouldScrollToNow()
     *
     * This method contains the logic to define whether the scroll to now action should be
     * fired or not.
     * 
     * @transition      object    the ember transition object
     */
    shouldScrollToNow(transition) {
      var shouldScrollToNow = true;

      let from = transition.from;
      let to = transition.to;

      /* 
      In most cases scroll to now should be fired once when entering from other routes (i.e not events).  
      
      There are some cases where, to optimise user experience the scroll to now action SHOULDN'T be fire.  

      These are:-

      1.  entering `/events` from `/venues&goBack=true` 
        (This is the use case where a user has viewed the 'venue' modal from the event modal)
      2.  entering `/events` from `/map&showBack=true` 
        (This is the use case where a user has viewed the 'map' from the event modal)
      3.  entering `events&viewType=clashfinder`
        (This is the use case where the events route is being viewed in clashfinder mode which has 
          it's own scrollToNow action)
      4.  when the model is reloaded because of the reload action triggered on entering route

      There are also some cases where transitions within the events route SHOULD trigger the scroll to now action.  

      These are:-

      1.  When it is the first time loading the route.
      2.  Where tags have changed
      3.  When toggling preferences

      */

      // 1.  entering `/events` from `/venues&goBack=true`
      if (from && from.name === 'map' && from.queryParams.showBack === 'true') {
        shouldScrollToNow = false;
      }

      // 2.  entering `/events` from `/map&showBack=true` 
      if (
        from &&
        from.name === 'venues' &&
        from.queryParams.goBack === 'true'
      ) {
        shouldScrollToNow = false;
      }

      // 3.  entering `events&viewType=clashfinder`
      if (
        this.paramsFor('events').viewType === 'clashfinder' &&
        this.firstLoad === true
      ) {
        shouldScrollToNow = false;
      }

      // Set shouldScrollToNow to true when tags have changed
      if (
        from && 
        from.name === 'events' &&
        to.name === 'events' &&
        this.haveFiltersChanged(transition) &&
        this.firstLoad === false
      ){
        shouldScrollToNow = true;
      }

      return shouldScrollToNow;
    },

    afterModel: function (model, transition) {
      // Events List (where viewType is not 'clashfinder')
      // If it is the first time loading the route and we shouldScrollToNow send the transition
      if (this.firstLoad && this.shouldScrollToNow(transition)) {
        transition.send(null, 'scrollToNow', {
          events: model.events,
          toggleSidebar: false,
        });
      }
      // Set first time loading to true to inform shouldScrollToNow() for future route transitions
      this.set('firstLoad', false);

      this._super(...arguments);
    },
    resetController(controller, isExiting, transition) {
      if (isExiting && transition.targetName !== 'error') {
        controller.set('eventModal', false);
        controller.set('eventModalModelID', null);
        controller.set('productionModal', false);
        controller.set('productionModalModelID', null);
      }
    },
    actions: {
      willTransition: function (transition) {
        // If transitioning away from events to another route or if the transition is into an events route from
        // the clashfinder route then reset the params.
        // Clashfinder is treated as a separate route to ensure scrollToNow actions are fired.
        if (
          transition.intent.name !== 'events' ||
          transition.from.queryParams.viewType === 'clashfinder'
        ) {
          // The header bottom should be hidden by default when transitioning to another route
          this.controllerFor('events').set('headerBottomShown', false);
          // controller.set('viewType', null);
          this.controllerFor('events').set('searchKeyword', '');
          this.controllerFor('application').set('headerShown', true);
          this.controllerFor('application').set('isEvents', false);
          this.set('hasInitialisedScroll', false);
          // Reset firstload so scroll to now action is triggered when next entering route.
          this.set('firstLoad', true);
        }

        // Clear the search if transitioning from events to my schedule.
        if (
          transition.intent.name === 'events' &&
          transition.to.queryParams.preferences === 'true'
        ) {
          this.filter.clearSearch();
        }

        // if filters have changed then set firstLoad to true so that scrollToNow action is triggered.
        if (this.haveFiltersChanged(transition)) {
          this.set('firstLoad', true);
        }
      },
      scrollToNow: function (data) {
        this.controllerFor('events').send('scrollToNow', data);
        return false;
      },
    },
  },
);
