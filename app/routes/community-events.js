import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import handleDataRefresh from '../mixins/handle-data-refresh';

export default Route.extend(handleDataRefresh, {
  router: service(),
  filter: service('filter'),
  settings: service('settings'),
  tokenService: service('token'),
  pouchDb: service('pouch-db'),
  location: service('location'),
  headerService: service('header'),
  store: service(),
  state: service(),

  queryParams: {
    selectedDateRange: {
      refreshModel: true,
    },
    selectedLocationRange: {
      refreshModel: true,
    },
    eventModal: {},
    eventModalModelID: {},
    preferences: {
      refreshModel: true,
    },
    liveStream: {
      refreshModel: true,
    },
    featured: {
      refreshModel: true,
    },
    showSubscribePanel: {},
  },

  async model(params) {
    var self = this;

    var events = await this.store.findAll('event');

    events = await events
      .filter(function (event) {
        // If provided use the event end time otherwise the start time.
        var diffTime =
          event.get('end_time') === null
            ? event.get('start_time')
            : event.get('end_time');
        // calculate the diff in hours between the current time and the start or end time.
        var diff = moment(diffTime).diff(moment(), 'hours');

        // Apply Filters
        // Search
        var includedInSearch = self
          .get('filter')
          .freeTextSearch(event.get('name'), params['searchKeyword']);

        // Date Range
        var dateRangeSelected = self
          .get('filter')
          .dateRange(event.get('start_time'), params['selectedDateRange']);

        // Location
        var includedInGeofence;
        if (params['selectedLocationRange']) {
          if (event.get('virtual_event') === true) {
            includedInGeofence = true;
          } else {
            includedInGeofence = self
              .get('location')
              .withinGeofence(
                [
                  self.controller.get('currentLocation.latitude'),
                  self.controller.get('currentLocation.longitude'),
                ],
                [
                  parseFloat(event.get('venue_lat')),
                  parseFloat(event.get('venue_long')),
                ],
                params['selectedLocationRange'],
              );
          }
        }

        // preferences
        var isPreferred = false;
        if (params['preferences']) {
          if (event.get('isPreferred')) {
            isPreferred = true;
          }
        }

        if (
          // If this event is a community event
          event.get('event_type') === 'community_event' &&
          // If the diff time is less than -4 (leave all events visible for four hours after the start/end time)
          diff > -4 &&
          // If the event is published
          event.get('aasm_state') == 'published' &&
          // If there is a search keyword and this result matches
          (params['searchKeyword'] === '' || includedInSearch) &&
          // If there is a date range selected and this event is within the date range
          (!params['selectedDateRange'] || dateRangeSelected) &&
          // If there is a location selected and this event is within the geofence
          (!params['selectedLocationRange'] || includedInGeofence) &&
          // If preferences is chosen and this event is preferred
          (!params['preferences'] || isPreferred === true) &&
          // If this event is featured
          (!params['featured'] || featured === true)
        ) {
          return event;
        }
      })
      .sortBy('start_time');

    let performanceVenues = this.store.findAll('venue');

    return hash({
      performanceVenues: performanceVenues,
      events: events,
    });
  },
  setupController(controller, model) {
    // Where a searchKeyword is set the headerBottom (search bar) should be displayed. 
    if (controller.get('searchKeyword') !== '') {
      controller.set('headerBottomShown', true);
    }

    this.settings
      .getSetting('pseudonymous-data-collection')
      .then((pseudonymousDataCollectionSetting) => {
        controller.set(
          'pseudonymousDataCollectionSetting',
          pseudonymousDataCollectionSetting,
        );
      });

    this.store
      .query('token2', { filter: { aasm_state: 'mined' } })
      .then((token2s) => {
        this.controllerFor('community-events').set('tokens', token2s);
      });

    this.settings
      .getSetting('community-events-selected-regions')
      .then((selectedRegions) => {
        controller.set('selectedRegions', selectedRegions || []);
      });

    this.headerService.showHeader();
  
    // If showSubscribePanel is set pass it through to the filtersShown controller attribute
    if(this.paramsFor('community-events').showSubscribePanel){
      controller.set('filtersShown', this.paramsFor('community-events').showSubscribePanel === 'true' ? false : true);
    }

    this._super(controller, model);
  },
  resetController(controller) {
    controller.set('eventModal', false);
    controller.set('eventModalModelID', null);
  },
  activate() {
    var self = this;
    this.refreshData().then(() => self.refresh());
  },
  afterModel(model, transition) {
    const hasLoadedCEBefore = localStorage.getItem(
      `hasLoadedBefore-introducing-community-events-${this.state.majorAppVersion}`
    );

    const hasLoadedBefore = hasLoadedCEBefore;

    if (
      transition.to.queryParams.featured === null &&
      hasLoadedBefore !== 'true'
    ) {
      this.transitionTo('splash', {
        queryParams: { type: 'introducing-community-events' },
      });
    }
    if (this.showSubscribePanel === true) {
      setTimeout(() => {
        window.rightSidebar.open();
      }, 1000);
    }
  },
  refreshData() {
    this.controllerFor('community-events').set('isLoadingModel', true);
    return this.performDataRefresh(
      'by_model_name_erlang/community_events_by_start_date',
      this.controllerFor('community-events'),
    );
  },
  actions: {
    reloadModel: function () {
      this.refreshData().then(() => this.refresh());
    }
  },
});
