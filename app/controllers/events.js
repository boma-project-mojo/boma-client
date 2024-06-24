import { alias } from '@ember/object/computed';
import { computed } from '@ember/object';
import { gt } from '@ember/object/computed';
import Controller, { inject as controller } from '@ember/controller';
import config from 'boma/config/environment';
import { inject as service } from '@ember/service';
import IsDataLoading from '../mixins/is-data-loading';
import { later } from '@ember/runloop';

export default Controller.extend(IsDataLoading, {
  store: service(),
  clashfinderService: service('clashfinder'),
  selectedCFDay: alias('clashfinderService.selectedCFDay'),
  preferenceToggle: service('preference-toggle'),
  pouchDbService: service('pouch-db'),
  applicationController: controller('application'),
  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  // Events List Config Starts
  displayFormat: 'grid', //list or grid
  hideImage: false,
  venueNameAsThumbnail: false,
  linkOnly: false,
  lessWordyCopy: alias('applicationController.lessWordyCopy'),
  // Events List Config Ends

  eventOrder: config.eventOrder,
  /* 
   * enableScrollToNow
   * 
   * Events can be ordered by the event name or chronologically. 
   * 
   * returns true if events are ordered by start_time or end_time
   * to enable scroll to now. 
   */
  enableScrollToNow: computed('eventOrder', function () {
    return ['start_time', 'end_time'].includes(this.eventOrder);
  }),

  listItemComponentName: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      return 'app-event-list-style';
    } else {
      return 'app-event';
    }
  }),

  /* 
   * itemHeight
   *
   * Calculate the height of an item for the appropriate
   * display format.
   * 
   * NB Duplicated here from collection-list component as it's required for both 
   * scrollToNow functionality and setting ember-collection height.
   */
  itemHeight: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      // Get the height of a list style item
      let listStyleItemHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--list-style-item-height',
        ),
      )
      // Get the width of a border
      let listStyleItemBorderWidth = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--list-border-width',
        ),
      )
      // Return the height of the list style item + the top and bottom borders
      return listStyleItemHeight + listStyleItemBorderWidth * 2;
    } else if (this.displayFormat === 'single-column') {
      return window.innerWidth - 8;
    } else {
      return Math.floor(window.innerWidth / 2 - 4);
    }
  }),

  filterService: service('filter'),

  queryParams: [
    'selectedTags',
    'selectedExcludedTags',
    'persistentSelectedTags',
    'searchKeyword',
    'selectedVenues',
    'selectedDays',
    'preferences',
    'productionModalModelID',
    'selectedCFDay',
    'viewType',
    'goBack',
  ],
  selectedDays: alias('filterService.selectedDays'),
  selectedVenues: alias('filterService.selectedVenues'),
  selectedTags: alias('filterService.selectedTags'),
  selectedExcludedTags: alias('filterService.selectedExcludedTags'),
  persistentSelectedTags: alias('filterService.persistentSelectedTags'),
  searchKeyword: alias('filterService.searchKeyword'),
  isSearching: alias('filterService.isSearching'),

  hasEvents: gt('model.events.length', 0),

  preferences: false,

  productionModal: false,
  productionModalModelID: null,
  eventModal: false,
  eventModalModelID: null,

  /* 
   * filterDays
   * 
   * Return an array of objects, one for each day of the festivals
   * used for populating the 'days' filter.  
   */
  filterDays: computed('days', function () {
    return this.days.map((d) => {
      let df = moment(d.datetime);

      // Support current and legacy filter_day format (legacy is Mon, Tue, Wed etc, current is MMDD)
      return {
        id: `${df.format('MMDD')},${df.format('ddd')}`,
        name: df.format('ddd D'),
      };
    });
  }),

  /* 
   * filtersSetClass
   * 
   * Return a class used to style the header glyph for filters if there is a 
   * filter set.  
   */
  filtersSetClass: computed(
    'searchKeyword',
    'selectedDays.length',
    'selectedTags.length',
    'selectedVenues.length',
    function () {
      if (
        this.searchKeyword !== '' ||
        (this.selectedDays && this.selectedDays.length > 0) ||
        (this.selectedVenues && this.selectedVenues.length > 0) ||
        (this.selectedTags && this.selectedTags.length > 0)
      ) {
        return 'filters-set';
      }
      return '';
    },
  ),

  clashfinderEnabled: config.clashfinderEnabled,

  actions: {
    /* 
     * clearFilters()
     *
     * Clears all filters.
     */
    clearFilters: function () {
      this.set('selectedTags', []);
      this.set('searchKeyword', '');
      this.set('selectedVenues', []);
      this.set('selectedDays', []);
      later(() => {
        this.send('reloadModel');
      }, 10);
      window.rightSidebar.close();
    },
    /* 
     * scrollToNow()
     *
     * Move the scroll position of the list to the current time if the
     * festival is currently taking place (and events are ordered chronologically).  
     */
    scrollToNow(data) {
      // If events are ordered alphanumerically then do not scroll to now
      if (this.enableScrollToNow === false) {
        this.set('scrollTop', 0);
        return false;
      }

      // If 'data' is not provided to the function then create the object.  
      if (data === false) {
        data = { events: this.model.events, toggleSidebar: false };
      }

      // Calculate the next event.
      var pointer = 0;
      let events = data.events;
      events.sortBy('start_time').find(function (ev, i) {
        var start_time = new moment(ev.get('start_time'));
        if (start_time > new moment()) {
          pointer = i;
          return true;
        }
      });

      // If the pointer is in the future
        // if the displayFormat is a grid
          // There are two events per line. 
          // calculate the scroll position by halving 'pointer' and multiplying by the itemHeight.  
        // else if the display format is list
          // There is only one event per link.  
          // calculate the scroll position by multiplying pointer by the itemHeight.  
      // else
        // set the scroll position to be the top of the list
      if (Math.round((pointer - 2) / 2) * this.itemHeight > 0) {
        if (this.displayFormat === 'grid') {
          this.set(
            'scrollTop',
            Math.round((pointer - 2) / 2) * this.itemHeight,
          );
        } else if (this.displayFormat === 'list') {
          this.set('scrollTop', Math.round(pointer - 2) * this.itemHeight);
        }
      } else {
        // To reset scroll when changing between festivals
        this.set('scrollTop', 0);
      }

      // Close the sidebar if the request came from a user action.  
      let toggleSidebar = data.toggleSidebar;
      if (toggleSidebar) {
        window.rightSidebar.close();
      }
      return false;
    },
    /* 
     * scrollToNowButton()
     *
     * Handle the user action to scroll to the current position
     */
    scrollToNowButton() {
      this.send('scrollToNow', {
        events: this.model.events,
        toggleSidebar: true,
      });
    },
    /* 
     * openProductionModal()
     *
     * Open the production modal
     */
    openProductionModal: function (productionID) {
      var self = this;
      this.store
        .findRecord('production', productionID)
        .then(function (production) {
          self.set('productionModal', true);
          self.set('productionModalModelID', production.id);
        })
        .catch((e) => {
          console.log(e);
        });
    },
    /* 
     * openEventModal()
     *
     * Open the event modal
     */
    openEventModal: function (eventID) {
      var self = this;
      this.store.findRecord('event', eventID).then(function (event) {
        self.set('eventModal', true);
        self.set('eventModalModelID', event.id);
      });
    },
    /* 
     * closeEventModal()
     *
     * Close the event modal
     */
    closeEventModal: function () {
      if (this.goBack === 'true') {
        history.back();
      } else {
        this.set('eventModal', false);
        this.set('eventModalModelID', null);
      }
    },
    /* 
     * closeProductionModal()
     *
     * Close the production modal
     */
    closeProductionModal: function () {
      if (this.goBack === 'true') {
        history.back();
      } else {
        this.set('productionModal', false);
        this.set('productionModalModelID', null);
      }
    },
    /* 
     * favouriteEvent()
     *
     * Add the event to the list of those preferred.
     * 
     * eventID      int       The id of the event.
     */
    favouriteEvent: function (eventID) {
      this.preferenceToggle.togglePreference('event', eventID);
    },
    /* 
     * changeCFDay()
     *
     * Change the currently visible day on the clashfinder view.  
     * 
     * day      string       day to change to in the format MMDD
     */    
    changeCFDay(day) {
      var self = this;

      // Hide the clashfinder to trigger animations.  
      this.clashfinderService.hide();

      // A small delay to wait for the clashfinder to hide.  
      later(() => {
        // Set the selected day and trigger the change in property.  
        self.set('selectedCFDay', day);
        self.notifyPropertyChange('selectedCFDay');
        // Scroll the screen to the first event
        if (self.model.events[day]) {
          self.clashfinderService.cfScrollToNow(
            day,
            self.model.events[day].venues.length,
          );
        }
        // A small delay to wait for cfScrollToNow to complete
        later(() => {
          // Show the clashfinder again.
          self.clashfinderService.show();
        }, 10);
      }, 100);
    },
    /* 
     * cfScrollToNow()
     *
     * Handle the user action to scroll the clashfinder to the current position
     */
    cfScrollToNow() {
      // Change the day to now
      this.send('changeCFDay', this.defaultGoToNowDay);
      // Scroll the screen to the now time
      this.clashfinderService.cfScrollToNow(
        this.defaultGoToNowDay,
        this.model.events[this.defaultGoToNowDay].venues.length,
      );
    },
  },
});
