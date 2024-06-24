/* 

Handle Data Refresh Mixin

This mixin provides functions and actions that are used by the application
routes to handle the requests to refresh data from couchdb on route activation.   

*/

import Mixin from '@ember/object/mixin';
import { inject as service } from '@ember/service';

export default Mixin.create({
  pouchDb: service('pouch-db'),
  logger: service(),
  /* 
   * performDataRefresh()
   *
   * Load the pouchdb data view provied and handle setting and resetting the states
   * for the header loading glyph UI to show loading/success/fail states.  
   * 
   * @viewName        str       A couchdb view name to load
   * @controller      str       The name of the controller to set attributes on
   * @adapterName     str       The name of the ember data adapter to use.  
   */
  performDataRefresh(viewName, controller, adapterName = 'application') {
    let currentDb = this.store.adapterFor(adapterName).db.name;
    return this.pouchDb
      .loadView(viewName, currentDb)
      .then(() => {
        // timeout because sometimes it is too quick
        setTimeout(() => {
          controller.set('isLoadingModel', false);
          controller.set('successReloadingModel', true);
          setTimeout(() => {
            controller.set('successReloadingModel', false);
          }, 1000);
        }, 1000);
      })
      .catch(() => {
        setTimeout(() => {
          controller.set('loadingErrors', 'errors');
          controller.set('isLoadingModel', false);
          controller.set('failedReloadingModel', true);
          setTimeout(() => {
            controller.set('failedReloadingModel', false);
          }, 1000);
          setTimeout(() => {
            controller.set('failedReloadingModel', false);
            controller.set('loadingErrors', null);
          }, 10000);
        }, 1000);
      });
  },
  /* 
   * active()
   *
   * Provides the ember `activate()` method for the routes this mixin is included in.  
   */
  activate() {
    var self = this;
    this.refreshData().then(() => {
      self.refresh()
    } ).catch((err)=>{
      this.logger.log(err, 'DEBUG');
    });
  },

  actions: {
    /* 
     * reloadModel()
     *
     * An action to trigger refreshing the data and reloading the route.  
     * 
     * @isAction      boolean       if true the data is refreshed before reloading the model.   
     */
    reloadModel(isAction) {
      var self = this;
      if (isAction) {
        this.refreshData(isAction).then(() => {
          // The promise in pouchdb loadView is being returned after the changes are received and before the
          // changes have been completed in ember data, hence a small timeout to wait for the data to be
          // available.
          setTimeout(() => {
            self.refresh();
          }, 500);
        });
      } else {
        self.refresh();
      }
    },
    /* 
     * reActivate()
     *
     * An action to re-run the `activate()` method.    
     */
    reActivate() {
      var self = this;
      self.activate();
    },
  },
});
