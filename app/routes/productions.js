import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import $ from 'jquery';
import queryParamsMixin from '../mixins/query-params';
import handleDataRefresh from '../mixins/handle-data-refresh';
import { hash } from 'rsvp';

export default Route.extend(
  queryParamsMixin,
  handleDataRefresh,
  {
    store: service(),
    queryParams: {
      searchKeyword: {
        refreshModel: true
      },
      productionModal: {},
      productionModalModelID: {},
      selectedTags: {
        refreshModel: true,
      },
      selectedExcludedTags: {
        refreshModel: true,
      },
    },
    router: service(),
    filter: service('filter'),
    init() {
      this._super(...arguments);
      // When leaving this route...
      this.router.on('routeWillChange', (transition) => {
        // If the transition takes us from the productions route
        if (transition.to.name !== 'productions') {
          // Hide the search bar header
          this.controllerFor('productions').set('headerBottomShown', false);
          // Make sure the header is shown
          this.controllerFor('application').set('headerShown', true);
        }
      });
    },
    model: function (params) {
      var self = this;

      var productions = this.store.findAll('production').then((productions) => {
        return productions.filter((production) => {
          // Search
          var includedInSearch = self
            .get('filter')
            .freeTextSearch(production.get('name'), params['searchKeyword']);

          // Filter by tag
          if (params['selectedTags']) {
            var selectedTags = $.map(params['selectedTags'], (t) =>
              parseInt(t),
            );
            var tagsSelected = self
              .get('filter')
              .manyIncludedInMany(production.get('tags'), selectedTags);
          }

          if (
            production.get('aasm_state') === 'published' &&
            (params['searchKeyword'] === '' || includedInSearch) &&
            (params['selectedTags'].length === 0 || tagsSelected)
          ) {
            return production;
          }
        });
      });

      return hash({
        productions: productions,
        events: this.store.findAll('event')
      });
    },
    setupController(controller, model) {
      // Where a searchKeyword is set the headerBottom (search bar) should be displayed. 
      if (controller.get('searchKeyword') !== '') {
        controller.set('headerBottomShown', true);
      }
      this._super(controller, model);
    },
    resetController(controller, isExiting, transition) {
      if (isExiting && transition.targetName !== 'error') {
        controller.set('productionModal', false);
        controller.set('productionModalModel', null);
      }
    },
    refreshData() {
      this.controllerFor('productions').set('isLoadingModel', true);
      return this.performDataRefresh(
        `${localStorage.getItem(
          'currentDb',
        )}_by_model_name_erlang/festival_dump`,
        this.controllerFor('productions'),
      );
    },
    actions: {
      openProductionModal: function (production) {
        this.controllerFor('productions').set('productionModal', true);
        this.controllerFor('productions').set(
          'productionModalModel',
          production,
        );
      },
      closeProductionModal: function () {
        this.controllerFor('productions').set('productionModal', false);
        this.controllerFor('productions').set('productionModalModel', null);
      },
    },
  },
);
