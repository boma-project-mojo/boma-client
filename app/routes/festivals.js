import Route from '@ember/routing/route';
import handleDataRefresh from '../mixins/handle-data-refresh';
import { inject as service } from '@ember/service';

export default Route.extend(handleDataRefresh, {
  store: service(),
  model: function () {
    return this.store.findAll('festival');
  },
  /* 
   * refreshData()
   *
   * Called in 'activate' callback by the `handleDataRefresh` mixin this function
   * requests the latest data for festivals from couchdb.  
   */
  refreshData() {
    return new Promise((resolve) => {
      if (this.controllerFor('festivals').get('isLoadingModel') === true) {
        resolve();
      } else {
        this.controllerFor('festivals').set('isLoadingModel', true);
        this.performDataRefresh(
          `by_model_name_erlang/all_festivals`,
          this.controllerFor('festivals'),
        ).then(() => {
          resolve();
        });
      }
    });
  },
  actions: {
    reloadModel: function () {
      this.refreshData().then(() => this.refresh());
    },
  },
});
