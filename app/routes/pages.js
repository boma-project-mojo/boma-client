import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import handleDataRefresh from '../mixins/handle-data-refresh';

export default Route.extend(handleDataRefresh, {
  store: service(),
  queryParams: {
    pageModal: {},
    pageModalModelID: {},
  },
  model: function () {
    return this.store.findAll('page').then((pages) => {
      return pages
        .filter(function (page) {
          if (page.get('aasm_state') === 'published') {
            return page;
          }
        })
        .sortBy('order');
    });
  },
  resetController(controller, isExiting, transition) {
    if (isExiting && transition.targetName !== 'error') {
      controller.set('pageModal', false);
      controller.set('pageModalModel', null);
      controller.set('pageModalModelID', null);
    }
  },
  refreshData() {
    this.controllerFor('pages').set('isLoadingModel', true);
    return this.performDataRefresh(
      `${localStorage.getItem('currentDb')}_by_model_name_erlang/all_pages`,
      this.controllerFor('pages'),
    );
  },
});
