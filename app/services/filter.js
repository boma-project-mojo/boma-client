/* 
 *
 * FILTERS SERVICE
 * 
 * This service handles the state of filters across all routes in the app.  
 * 
 * Where multiple filters can be selected results are stored in the format
 * 
 *  `selectedVenues[]=27507&selectedVenues[]=27586`
 * 
 * in the URL and serialised back in to an array by serializeQueryParam and
 * deserializeQueryParam which are defined in the query-params mixin.  
 * 
 */

import Service from '@ember/service';
import { gt } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import { debounce } from '@ember/runloop';
import RSVP from 'rsvp';

export default Service.extend({
  router: service('router'),
  searchTerm: '',
  // Initialise variables to store the various query params used for filters.  
  // The functions in the service assume that the attributes are named 'selected' followed by
  // the name of the model e.g selectedDays
  searchKeyword: '',
  selectedDays: [],
  selectedVenues: [],
  selectedTags: [],
  selectedExcludedTags: [],
  persistentSelectedTags: [],
  selectedDiets: [],
  selectedCreator: null,
  selectedDateRange: null,
  selectedLocationRange: null,
  featuredSelected: false,
  isSearching: false,
  hasSearchTerm: gt('searchKeyword.length', 0),

  /*
   * KEYWORD SEARCH
   *
   * Searching is debounced to avoid the model being reloaded after each key up
   * on the search form.  
   * 
   * To allow this the form input it abstracted from the query param, the following
   * functions handle the updating of the `searchKeyword` query parameter.
   */

  /* 
   * updateSearchFilter()
   * 
   * term       str       The search term 
   * 
   * Debounced function to update search filter.  
   */
  updateSearchFilter(term) {
    this.set('isSearching', true)
    return new RSVP.Promise((resolve, reject) => {
      debounce(this, this.doUpdateSearchFilter, term, resolve, reject, 1000);
    });
  },
  /* 
   *
   * doUpdateSearchFilter()
   * 
   * term       str       The search term 
   * 
   * Update the `searchKeyword` query param. 
   */
  doUpdateSearchFilter(term) {
    var routeName = this.router.currentRoute.name;
    this.set('searchKeyword', term);
    getOwner(this)
      .lookup('route:' + routeName)
      .send('reloadModel');
    this.set('isSearching', false)
  },

  /* 
   *
   * SET ATTRIBUTES
   * 
   * The following functions are used when setting attributes stored on this service
   * which are later used by the model when querying for records.  
   * 
   */

  /* 
   * updateSelected()
   * 
   * modelName        str       the name of the filter to be updated 
   * modelId          int       the id which should to be set
   * 
   * Add and remove the id from this selectedFilter array.  
   */
  updateSelected(modelName, modelId = null) {
    let camelCaseModelName =
      modelName.charAt(0).toUpperCase() + modelName.slice(1);
    if (this[`selected${camelCaseModelName}s`].includes(modelId)) {
      this[`selected${camelCaseModelName}s`].removeObject(modelId);
    } else {
      this[`selected${camelCaseModelName}s`].pushObject(modelId);
    }
  },
  /* 
   * updateSelectedRadio()
   * 
   * modelName        str       the name of the filter to be updated 
   * modelId          int       the id which should to be set
   * 
   * Store checked or unchecked radio button values.  
   */
  updateSelectedRadio: function (modelName, modelId) {
    let camelCaseModelName =
      modelName.charAt(0).toUpperCase() + modelName.slice(1);
    if (parseInt(this[`selected${camelCaseModelName}`]) === modelId) {
      this.set(`selected${camelCaseModelName}`, null);
    } else {
      this.set(`selected${camelCaseModelName}`, modelId);
    }
  },
  /* 
   * updateSelectedBoolean()
   *
   * label        string        The label for attribute to store this filter value in
   * value        boolean       The value to set
   * 
   * Set the attribute of a boolean filter.  
   */
  updateSelectedBoolean(label, value) {
    this.set(`${label}Selected`, value);
  },

  /* 
   *
   * MODEL FUNCTIONS
   * 
   * The following functions are used by the model when filtering
   * results by selected filters.  
   * 
   */

  /* 
   * freeTextSearch()
   * 
   * searchIn           string        The string of text to search for the search term in
   * searchTerm         string        The term to search for in the string
   * 
   * Search for a term in a string
   */
  freeTextSearch(searchIn, searchTerm) {
    if (searchTerm) {
      var includeInSearch = false;
      if (searchIn) {
        if (searchIn.search(new RegExp(searchTerm, 'i')) !== -1) {
          includeInSearch = true;
        }
      }
      return includeInSearch;
    }
  },
  /* 
   * oneIncludedInMany()
   *
   * searchIn                 array       The array of items to search
   * selectedFilterOptions    string      The item to search for in the array
   * 
   * Search for an exact match of one item in an array of items.
   * 
   * e.g searchIn of [1, 2, 4] with selectedFilterOptions of 1 would return true.  
   */
  oneIncludedInMany(searchIn, selectedFilterOptions) {
    var selected = false;
    if (selectedFilterOptions.length > 0) {
      if (selectedFilterOptions.includes(searchIn)) {
        selected = true;
      }
      return selected;
    }
  },
   /* 
   * manyIncludedInMany()
   *
   * searchIn                 array       The array of items to search
   * selectedFilterOptions    array      The item to search for in the array
   * 
   * Search for an exact match for any of more than one items in 
   * an array of items.  
   * 
   * e.g a searchIn of [1,2,3] and selectedFilterOptions would return true for an array
   * [1,7,8].  
   */ 
  manyIncludedInMany(searchIn, selectedFilterOptions) {
    var selected = false;
    if (selectedFilterOptions.length > 0) {
      if (searchIn && searchIn.length > 0) {
        searchIn.forEach(function (filterItem) {
          if (selectedFilterOptions.includes(filterItem)) {
            selected = true;
          }
        });
      }
    }
    return selected;
  },
  /* 
   * manyNotIncludedInMany()
   *
   * searchIn                 array       The array of items to search
   * selectedFilterOptions    array      The item to search for in the array
   * 
   * Search for items that do not include any of the items included in the searchIn 
   * array.  
   * 
   * E.g searchIn of [1, 2] and a selectedFilterOptions of [1, 2, 4] would return false
   * because 1 and 2 are included in both arrays.  
   */ 
  manyNotIncludedInMany(searchIn, selectedFilterOptions) {
    var notSelected = false;
    if (selectedFilterOptions.length > 0) {
      if (searchIn && searchIn.length > 0) {
        searchIn.forEach(function (filterItem) {
          if (selectedFilterOptions.includes(filterItem) === false) {
            notSelected = true;
          } else {
            notSelected = false;
          }
        });
      } else {
        notSelected = true;
      }
    }
    return notSelected;
  },
  /* 
   * dateRange()
   * 
   * startDate    datetime      The start date of the event to check
   * dateRange    datetime      The number of days you want to show events within
   * 
   * Returns true if the start date specified is within the date range specified
   * 
   * e.g  an event starting on the 1st of June 2023, with a dateRange of 7 would be shown if
   * the current date was anytime between the 26th of May and the 1st of June. 
   */
  dateRange(startDate, dateRange) {
    var selected = false;
    var diff = moment(startDate).diff(moment(), 'days');
    if (diff > 0 && diff <= dateRange) {
      selected = true;
    }
    return selected;
  },
  
  /* 
   * clearSearch()
   *
   * Clear the search
   */
  clearSearch(){
    this.set('searchTerm', '');
    this.doUpdateSearchFilter('');
  },

});
