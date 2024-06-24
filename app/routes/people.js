import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),
  filter: service('filter'),
  queryParams: {
    searchKeyword: {},
  },
  model: function (params) {
    var self = this;

    return this.store.findAll('person').then((people) => {
      return people.filter(function (person) {
        var includedInSearch = self
          .get('filter')
          .freeTextSearch(
            person.get('firstname') + person.get('surname'),
            params['searchKeyword'],
          );

        if (
          (params['searchKeyword'] === '' || includedInSearch) &&
          person.get('aasm_state') == 'published'
        ) {
          return person;
        }
      });
    });
  },
  setupController(controller, model) {
    // Where a searchKeyword is set the headerBottom (search bar) should be displayed. 
    if (controller.get('searchKeyword') !== '') {
      controller.set('headerBottomShown', true);
    }
    this._super(controller, model);
  },
  actions: {
    reloadModel: function () {
      this.refresh();
    },
  },
});
