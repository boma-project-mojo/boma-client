import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Component.extend({
  tagName: '',

  filterService: service('filter'),
  headerService: service('header'),

  searchInputPlaceholder: '\uf002 Search', // Text for search input placeholder

  searchTerm: alias('filterService.searchTerm'), // The attribute used to store the search term (different from searchKeyword query param to allow for debouncing of the model reload)

  isSearching: alias('filterService.isSearching'), // If true we are currently reloading the model
  hasSearchTerm: alias('filterService.hasSearchTerm'), // If true searchKeyword is not blank

  headerBottomShownClass: alias('headerService.headerBottomShownClass'), // The CSS class if the search bar is shown.  

  init() {
    this._super(...arguments);
    // Initialise searchTerm on the render of this component.
    this.set('searchTerm', '');
  },

  actions: {
    /* 
     * updateSearchFilter()
     * 
     * value      string      The value that should be set for searchKeyword
     * 
     * Debounced update of searchKeyword query param.  
     */
    updateSearchFilter(value) {
      this.filterService.updateSearchFilter(value.target.value);
    },
    /* 
     * clearSearch()
     *
     * Clear searchKeyword and searchTerm and reload the model
     */
    clearSearch(){
      this.filterService.clearSearch();
    }
  },
});
