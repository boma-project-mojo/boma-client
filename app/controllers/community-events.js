import { alias } from '@ember/object/computed';
import { computed } from '@ember/object';
import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import GoToRouteMixin from '../mixins/go-to-route';
import IsDataLoading from '../mixins/is-data-loading';

export default Controller.extend(GoToRouteMixin,IsDataLoading,{
  applicationController: controller('application'),
  
  store: service(),
  preferenceToggle: service('preference-toggle'),
  pouchDb: service('pouch-db'),
  settings: service('settings'),
  notificationsService: service('notifications'),
  tokenService: service('token'),
  location: service(),

  filterService: service('filter'),
  selectedDateRange: alias('filterService.selectedDateRange'),
  selectedLocationRange: alias('filterService.selectedLocationRange'),
  searchKeyword: alias('filterService.searchKeyword'),

  filtersShown: true,

  queryParams: ['selectedDateRange', 'selectedLocationRange', 'searchKeyword', 'showSubscribePanel'],

  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  locationStatus: null,

  // Regions list used for selecting regions to subscribe to notifications for.  
  regions: computed('selectedRegions', function () {
    const regionList = [
      { id: 0, name: 'World' },
      { id: 1, name: 'Europe' },
      { id: 2, name: 'Scotland' },
      { id: 3, name: 'North East' },
      { id: 4, name: 'North West' },
      { id: 5, name: 'Yorkshire' },
      { id: 6, name: 'Midlands' },
      { id: 7, name: 'East of England' },
      { id: 8, name: 'Wales' },
      { id: 9, name: 'London' },
      { id: 10, name: 'South East' },
      { id: 11, name: 'South West' },
    ];
    return regionList.map((r) => {
      if (this.selectedRegions && this.selectedRegions.indexOf(r.id) !== -1) {
        r.selected = true;
      }
      return r;
    });
  }),

  // Date ranges used for date filter.  
  dateRanges: computed(function () {
    return [
      { id: 7, name: 'This week' },
      { id: 28, name: 'This month' },
      { id: 90, name: 'This quarter' },
    ];
  }),

  // Location ranges used for location filter.  
  locationRanges: computed(function () {
    return [
      { id: 1, name: 'Within 1 miles' },
      { id: 5, name: 'Within 5 miles' },
      { id: 10, name: 'Within 10 miles' },
      { id: 50, name: 'Within 50 miles' },
    ];
  }),

  // Check if there are filters set
  filtersSetClass: computed(
    'searchKeyword',
    'selectedDateRange',
    'selectedLocationRange',
    function () {
      if (
        this.searchKeyword !== '' ||
        this.selectedLocationRange !== null ||
        this.selectedDateRange !== null
      ) {
        return 'filters-set';
      }
      return '';
    },
  ),

  /*
   * setCurrentLocation()
   *
   * Using the location service, acquire the current location of the user and set `currentLocation` on the 
   * controller to be the returned coordinates.
   *
   * Set locationStatus to update the progress in the UI.  
   *
   * Resolve a promise on completion or error.
   */
  setCurrentLocation() {
    var self = this;
    return new Promise((resolve) => {
      self.set('locationStatus', 'Waiting for location...');
      this.location.getLocation().then(
        function (location) {
          self.set('locationStatus', 'Location acquired.');
          self.set('currentLocation', location.coords);
          resolve();
        },
        function () {
          self.set('locationStatus', 'Location not available.');
          resolve();
        },
      );
    });
  },

  actions: {
    /* 
     * setSelectedRegions()
     *
     * The function sets the selected regions which are stored as a setting locally and
     * synced with the remote server.  
     * 
     * @region      str       the id of the region that should be added 
     */
    setSelectedRegions: async function (region) {
      // Update this.regions to show this option as selected
      let selectedRegion = this.regions.find((r) => r.id === region.id);
      selectedRegion.selected = selectedRegion.selected === true ? false : true;
      // Collect the selected ids and serialise them ready for persisting the setting
      const selectedRegions = this.regions
        .filter((r) => {
          if (r.selected == true) {
            return r;
          }
        })
        .map((r) => {
          return r.id;
        });
      // Set the setting locally
      await this.settings.setSetting(
        'community-events-selected-regions',
        selectedRegions,
      );
      await this.settings.saveSetting();
      // Sync the settings to the remote server.
      let wallet = await this.tokenService.getWallet();
      await this.notificationsService.updateRemoteAddressRecord(wallet.address);
    },
    /* 
     * openEventModal()
     *
     * Opens the event modal
     * 
     * eventID      int       The id of the event.  
     */
    openEventModal(eventID) {
      var self = this;
      this.store.findRecord('event', eventID).then(function (event) {
        self.set('eventModal', true);
        self.set('eventModalModelID', event.id);
      });
    },
    /* 
     * closeEventModal()
     *
     * Closes the event modal
     */
    closeEventModal() {
      this.set('eventModal', false);
      this.set('eventModalModelID', null);
    },
    /* 
     * favouriteEvent()
     *
     * Add the event to the list of those preferred.  
     * 
     * eventID      int       The id of the event.  
     */
    favouriteEvent(eventID) {
      this.preferenceToggle.togglePreference('event', eventID);
    },
    /* 
     * clearFilters()
     *
     * Return all filters back to their default values.  
     */
    clearFilters() {
      this.set('selectedDateRange', null);
      this.set('selectedLocationRange', null);
      window.rightSidebar.close();
    },
    /* 
     * toggleFilters()
     *
     * Toggle the right hand sidebar open or close.  
     */
    toggleFilters() {
      const filtersShown = this.filtersShown;
      // For the first time when navigating from Subscription panel to Filters
      // Revert the showSubscribePanel query param to false so that the subscription panel isn't shown
      // when a filter is selected.   
      this.set('showSubscribePanel', false);
      this.set('filtersShown', !filtersShown);
    },
    /* 
     * reload()
     *
     * Reload the route to get new data.  
     */
    reload() {
      this.send('reloadModel');
    },
    /*
     * setLocationFilter()
     * 
     * Action to update the selected radio button to trigger the model change then get the current location
     * for use when loading the model.
     */
    async setLocationFilter(modelName, selected) {
      await this.setCurrentLocation();
      this.filterService.updateSelectedRadio(modelName, selected);
    },
  },
});
