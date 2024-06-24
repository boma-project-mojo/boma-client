import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import IsDataLoading from '../mixins/is-data-loading';

export default Controller.extend(IsDataLoading, {
  applicationController: controller('application'),

  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  filterService: service('filter'),
  isSearching: alias('filterService.isSearching'),
  searchKeyword: alias('filterService.searchKeyword'),
  selectedDiets: alias('filterService.selectedDiets'),
  selectedTags: alias('filterService.selectedTags'),
  persistentSelectedTags: alias('filterService.persistentSelectedTags'),

  preferenceToggle: service('preference-toggle'),

  queryParams: [
    'venueType',
    'selectedDiets',
    'selectedTags',
    'searchKeyword',
    'selectedExcludedTags',
    'pageName',
    'preferences',
    'goBack',
  ],
  venueType: '',
  venueModal: false,
  venueModalModel: null,
  preferences: false,

  /* 
   * publicVenueType
   *
   * Return the header title for the given venueType
   */
  publicVenueType: computed('venueType', function () {
    var publicVenueType;
    if (this.venueType === 'retailer') {
      publicVenueType = 'Food & Drink';
    } else if (this.venueType === 'performance') {
      publicVenueType = 'Venues';
    }
    return publicVenueType;
  }),

  /* 
   * retailer
   *
   * Returns true if the venueType equal 'retailer'
   */
  retailer: equal('venueType', 'retailer'),

  /* 
   * diets
   *
   * Returns an array of diet tag objects used when filtering retailers.  
   */
  diets: computed(function () {
    return [
      { name: 'Gluten Free', id: 'Gluten Free' },
      { name: 'Dairy Free', id: 'Dairy Free' },
      { name: 'Vegan', id: 'Vegan' },
    ];
  }),

  /* 
   * filtersSetClass
   *
   * returns a class name to allow styling header glyphs if the filters are set.  
   */
  filtersSetClass: computed(
    'searchKeyword',
    'selectedDiets.length',
    'selectedTags.length',
    function () {
      var filtersSetClass = '';
      if (
        this.searchKeyword !== '' ||
        this.selectedTags.length > 0 ||
        this.selectedDiets.length > 0
      ) {
        filtersSetClass = 'filters-set';
      }
      return filtersSetClass;
    },
  ),
  actions: {
    /* 
     * openVenueModal()
     *
     * opens the venue modal
     * 
     * @venue       Ember Data object     The ember data object for this venue to open in the modal
     */
    openVenueModal: function (venue) {
      this.set('venueModal', true);
      this.set('venueModalModelID', venue.id);
    },
    /* 
     * closeVenueModal()
     *
     * closes the venue modal
     */
    closeVenueModal: function () {
      // if goBack is true
        // Use the browser navigation history to go back (e.g to the event/production modal that was navigated from)
      // else
        // Close the modal by initialising attributes 
      if (this.goBack === 'true') {
        history.back();
      } else {
        this.set('venueModal', false);
        this.set('venueModalModelID', null);
      }
    },
    /* 
     * clearFilters()
     *
     * Clears all filters.
     */
    clearFilters: function () {
      this.set('searchKeyword', '');
      this.set('selectedDiets', []);
      this.set('selectedTags', []);
      window.rightSidebar.close();
    },
    /* 
     * favouriteVenue()
     *
     * Add the venue to the list of those preferred.
     * 
     * venueID      int       The id of the venue.
     */
    favouriteVenue: function (venueID) {
      this.preferenceToggle.togglePreference('venue', venueID);
    },
  },
});
