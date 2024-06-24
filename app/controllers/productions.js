import { alias } from '@ember/object/computed';
import Controller, { inject as controller } from '@ember/controller';
import { computed } from '@ember/object';
import ENV from 'boma/config/environment';
import { inject as service } from '@ember/service';
import $ from 'jquery';
import IsDataLoading from '../mixins/is-data-loading';
import { later } from '@ember/runloop';

export default Controller.extend(IsDataLoading, {
  store: service(),
  applicationController: controller('application'),
  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  filterService: service('filter'),

  queryParams: ['searchKeyword', 'selectedTags'],
  searchKeyword: alias('filterService.searchKeyword'),
  selectedTags: alias('filterService.selectedTags'),

  productionModal: false,
  productionModalModelID: null,

  /* 
   * modelSorted
   *
   * Returns the routes model ordered by name.
   */
  modelSorted: computed('model', function () {
    return this.model.productions.sortBy('name');
  }),

  // Productions config starts
  displayFormat: 'grid',
  // Productions config ends

  /* 
   * listItemComponentName
   *
   * list and grid display formats are available for productions, configured using 
   * 'displayFormat' variable above.   
   * 
   * returns the component name appropriate to this display format.  
   */
  listItemComponentName: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      return 'app-production-list-style';
    } else {
      return 'app-production';
    }
  }),

  actions: {
    /* 
     * openProductionModal()
     *
     * open the production modal
     * 
     * productionID     int     the id of the production
     */
    openProductionModal: function (productionID) {
      var self = this;
      // Find the production record then open the modal
      this.store
        .findRecord('production', productionID)
        .then(function (production) {
          self.set('productionModal', true);
          self.set('productionModalModelID', production.id);
        });
    },
    /* 
     * closeProductionModal()
     *
     * close the production modal
     */
    closeProductionModal: function () {
      // If goBack is true
        // return to the previous page using the browser history (e.g to allow returning to an event modal)
      // else
        // close the modal
      if (this.goBack === 'true') {
        history.back();
      } else {
        this.set('productionModal', false);
        this.set('productionModalModelID', null);
      }
    },
  },
});
