import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import queryParamsMixin from '../mixins/query-params';
import $ from 'jquery';
import handleDataRefresh from '../mixins/handle-data-refresh';

export default Route.extend(
  queryParamsMixin,
  handleDataRefresh,
  {
    store: service(),
    filter: service('filter'),
    headerService: service('header'),
    preferenceService: service('preference-toggle'),
    queryParams: {
      venueType: {
        refreshModel: true,
      },
      selectedDiets: {
        refreshModel: true,
      },
      selectedTags: {
        refreshModel: true,
      },
      selectedExcludedTags: {
        refreshModel: true,
      },
      persistentSelectedTags: {},
      venueModal: {},
      venueModalModelID: {},
      searchKeyword: {
        refreshModel: true,
      },
      pageName: {},
      preferences: {
        refreshModel: true,
      },
      goBack: {},
    },
    async model(params) {
      var self = this;

      if (params['preferences']) {
        var ps = await this.preferenceService.getPreferences();
      }

      // Tags are only currently used for venues that are retailers.  
      // If the venueType is retailer
        // get published tags with the tag_type 'retailer'
      if (params['venueType'] === 'retailer') {
        var retailerTags = self.store.findAll('tag').then((all_tags) => {
          return all_tags.filter(function (tag) {
            if (
              tag.get('aasm_state') == 'published' &&
              tag.get('tag_type') == 'retailer'
            ) {
              return tag;
            }
          });
        });
      }


      var selectedExcludedTags = [];
      if (
        params['selectedExcludedTags'] &&
        params['selectedExcludedTags'].length > 0
      ) {
        if (Array.isArray(params['selectedExcludedTags'])) {
          selectedExcludedTags = $.map(params['selectedExcludedTags'], (t) =>
            parseInt(t),
          );
        } else {
          selectedExcludedTags = $.map(
            params['selectedExcludedTags'].split(','),
            (t) => parseInt(t),
          );
        }
      }

      var venues = this.store.findAll('venue').then((vs) => {
        return vs
          .filter(function (venue) {
            // Venue type
            var includedVenue = self
              .get('filter')
              .oneIncludedInMany(venue.get('venue_type'), params['venueType']);

            // Search
            var includedInSearch = self
              .get('filter')
              .freeTextSearch(venue.get('name'), params['searchKeyword']);

            // Filter by diet
            var selectedDiets = $.map(params['selectedDiets'], (d) => d);
            var dietNames = $.map(
              venue.get('dietary_requirements'),
              (dr) => dr.name,
            );
            var dietSelected = self
              .get('filter')
              .manyIncludedInMany(dietNames, selectedDiets);

            // Filter by tag
            var selectedTags = [];
            selectedTags = $.map(params['selectedTags'], (t) => parseInt(t));
            var persistentSelectedTags = $.map(
              params['persistentSelectedTags'],
              (t) => parseInt(t),
            );
            selectedTags = selectedTags.concat(persistentSelectedTags);
            var tagsSelected = self
              .get('filter')
              .manyIncludedInMany(venue.get('tags'), selectedTags);

            // Tags excluded
            var venueNotExcluded = false;
            if (selectedExcludedTags && selectedExcludedTags.length > 0) {
              venueNotExcluded = self
                .get('filter')
                .manyNotIncludedInMany(venue.get('tags'), selectedExcludedTags);
            }

            // preferences
            if (params['preferences']) {
              var isPreferred = self
                .get('filter')
                .oneIncludedInMany(parseInt(venue.id), ps.venues);
            }

            if (
              (params['venueType'].length === 0 || includedVenue) &&
              (params['searchKeyword'] === '' || includedInSearch) &&
              (params['selectedDiets'].length === 0 || dietSelected) &&
              (selectedTags.length === 0 || tagsSelected) &&
              (selectedExcludedTags.length === 0 || venueNotExcluded) &&
              (params['preferences'] === false || isPreferred === true) &&
              venue.get('aasm_state') == 'published'
            ) {
              return venue;
            }
          })
          .sortBy('list_order');
      });

      return hash({
        retailerTags: retailerTags,
        venues: venues,
      });
    },
    setupController(controller, model) {
      // Where a searchKeyword is set the headerBottom (search bar) should be displayed. 
      if (controller.get('searchKeyword') !== '') {
        controller.set('headerBottomShown', true);
      }
      this._super(controller, model);

      this.headerService.showHeader();
    },
    resetController(controller, isExiting, transition) {
      if (isExiting && transition.targetName !== 'error') {
        controller.set('venueModal', false);
        controller.set('venueModalModel', null);
        controller.set('venueModalModelID', null);
        controller.set('searchKeyword', '');
      }
    },
    refreshData() {
      this.controllerFor('venues').set('isLoadingModel', true);
      return this.performDataRefresh(
        `${localStorage.getItem('currentDb')}_by_model_name_erlang/all_venues`,
        this.controllerFor('venues'),
      );
    },
    actions: {
      willTransition: function (transition) {
        if (transition.intent.name !== 'venues') {
          this.controllerFor('venues').set('headerBottomShown', false);
        }
        this.controllerFor('application').set('headerShown', true);
      }
    },
  },
);
