import Route from '@ember/routing/route';
import ENV from 'boma/config/environment';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),
  router: service(),
  queryParams: {
    type: {},
  },
  model() {
    // If there is a default festival set in the config then load it into the model
    if (ENV['festivalId']) {
      return this.store.findRecord('festival', ENV['festivalId']);
    }
  },
});
