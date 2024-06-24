import Component from '@ember/component';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';

export default Component.extend({
  router: service(),
  filterService: service('filter'),
  currentRouteName: reads('router.currentRouteName'),
  actions: {
    clearSearch(){
      this.filterService.clearSearch('');
    }
  }
});
