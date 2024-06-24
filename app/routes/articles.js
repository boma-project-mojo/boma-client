import Route from '@ember/routing/route';
import $ from 'jquery';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import queryParamsMixin from '../mixins/query-params';
import handleDataRefresh from '../mixins/handle-data-refresh';
import Lunr from 'lunr';
import { later } from '@ember/runloop';

export default Route.extend(
  queryParamsMixin,
  handleDataRefresh,
  {
    router: service(),
    state: service(),
    filter: service('filter'),
    pouchDb: service('pouch-db'),
    tokenService: service('token'),
    store: service(),
    headerService: service('header'),
    queryParams: {
      articleModal: {},
      articleModalModelID: {},
      searchKeyword: {
        refreshModel: true,
      },
      tagType: {},
      selectedTags: {
        refreshModel: true,
      },
      persistentSelectedTags: {},
      selectedExcludedTags: {
        refreshModel: true,
      },
      selectedCreator: {
        refreshModel: true,
      },
      articleType: {
        refreshModel: true,
      },
      preferences: {
        refreshModel: true,
      },
      featuredSelected: {
        refreshModel: true,
      },
      goBack: {},
    },
    wallet: null,
    beforeModel() {
      if (this.paramsFor('articles').articleType === 'community_article') {
        return this.tokenService.getWallet().then((wallet) => {
          this.set('wallet', wallet);
        });
      }
    },
    model: function (params) {
      var self = this;

      var selectedTags = [];
      selectedTags = $.map(params['selectedTags'], (t) => parseInt(t));
      // merge tags set in the persistentSelected field to the selected tags array
      var persistentSelectedTags = $.map(
        params['persistentSelectedTags'],
        (t) => parseInt(t),
      );
      selectedTags = selectedTags.concat(persistentSelectedTags);

      var selectedExcludedTags = [];
      selectedExcludedTags = $.map(params['selectedExcludedTags'], (t) =>
        parseInt(t),
      );

      var selectedYears = [];
      selectedYears = $.map(params['selectedYears'], (t) =>
        parseInt(t),
      );

      var tags = this.store.findAll('organisation-tag');

      this.set('article_type', params['articleType']);

      var articles = this.store.findAll('article').then((all_articles) => {
        articles = all_articles
          .filter(function (article) {
            if (params['articleType']) {
              if (article.get('article_type') === params['articleType']) {
                return article;
              }
            } else {
              if (article.get('article_type') === 'boma_article') {
                return article;
              }
            }
          })
          .filter(function (article) {
            // Search
            // var includedInSearch = self.get('filter').freeTextSearch(article.get('title'), params['searchKeyword']);

            // preferences
            var featured = false;
            if (params['featuredSelected']) {
              if (article.get('featured')) {
                featured = true;
              }
            }

            // Tags
            if (selectedTags.length > 0) {
              var tagsSelected = self
                .get('filter')
                .manyIncludedInMany(article.get('tags'), selectedTags);
            }

            // Tags excluded
            if (selectedExcludedTags.length > 0) {
              var articleNotExcluded = self
                .get('filter')
                .manyNotIncludedInMany(
                  article.get('tags'),
                  selectedExcludedTags,
                );
            }

            // preferences
            var isPreferred = false;
            if (params['preferences']) {
              if (article.get('isPreferred')) {
                isPreferred = true;
              }
            }

            // owner
            var isBySelectedCreator = false;
            if (params['selectedCreator'] == 1) {
              //0 = all, 1 = me
              if (article.get('address_short_hash')) {
                isBySelectedCreator =
                  article.get('address_short_hash') ===
                  self.tokenService.walletAddressShortHash(
                    self.get('wallet.address'),
                    article.get('id'),
                  );
              }
            }

            if (
              // (params["searchKeyword"] === "" || includedInSearch) &&
              (selectedTags.length === 0 || tagsSelected) &&
              (selectedExcludedTags.length === 0 || articleNotExcluded) &&
              (!params['preferences'] || isPreferred === true) &&
              (!params['selectedCreator'] || isBySelectedCreator) &&
              (!params['featuredSelected'] || featured === true) &&
              article.get('aasm_state') == 'published'
            ) {
              return article;
            }
          })
          .sortBy('last_updated_at')
          .reverse()
          .slice(0, 300);

        if (params['searchKeyword']) {
          var idx = Lunr(function () {
            this.ref('id');
            this.field('title');
            this.field('content');

            articles.forEach(function (doc) {
              this.add(doc);
            }, this);
          });

          var articleIds = idx
            .search(`${params['searchKeyword']}~1`)
            .mapBy('ref');

          articles = articles.filter((article) => {
            if (articleIds.includes(article.get('id'))) {
              return article;
            }
          });
        }

        return articles;
      });

      return hash({
        tags: tags,
        articles: articles,
        wallet: this.wallet,
      })
        .then((hash) => {
          return hash;
        })
        .catch((err) => {
          console.log('error', err);
        });
    },

    setupController(controller, model) {
      // Where a searchKeyword is set the headerBottom (search bar) should be displayed.  
      if (controller.get('searchKeyword') !== '') {
        controller.set('headerBottomShown', true);
      }

      this.headerService.showHeader();

      this._super(controller, model);
    },
    resetController(controller, isExiting, transition) {
      // If transitioning between article types within this route...
      if (
        transition.from.queryParams.articleType !==
        transition.to.queryParams.articleType
      ) {
        controller.set('scrollTop', 0);

        later(() => {
          if (
            Array.isArray(transition.to.queryParams.selectedTags) &&
            transition.to.queryParams.selectedTags.length > 0
          ) {
            controller.set(
              'selectedTags',
              transition.to.queryParams.selectedTags,
            );
          } else {
            controller.set('selectedTags', []);
          }

          controller.set('searchKeyword', '');

          this.activate();
        }, 10);
      }

      if (isExiting && transition.targetName !== 'error') {
        controller.set('articleModal', false);
        controller.set('articleModalModel', null);
        controller.set('articleModalModelID', null);
        controller.set('selectedTags', []);
        controller.set('selectedCreator', null);
      }
    },
    afterModel() {
      const params = this.paramsFor(this.routeName);
      if (params.articleType === 'community_article') {
        const hasSeenCommunityNoticeboardBefore = localStorage.getItem(
          `hasLoadedBefore-introducing-community-noticeboard-${this.state.majorAppVersion}`,
        );

        if (hasSeenCommunityNoticeboardBefore !== 'true') {
          this.router.transitionTo('splash', {
            queryParams: { type: 'introducing-community-noticeboard' },
          });
        }
      }
    },

    /* 
    * refreshData()
    *
    * Called in 'activate' callback by the `handleDataRefresh` mixin this function
    * requests the latest data for articles from couchdb.  
    */
    refreshData() {
      this.controllerFor('articles').set('isLoadingModel', true);
      if (this.article_type !== 'community_article') {
        return this.performDataRefresh(
          'by_model_name_erlang/all_boma_articles',
          this.controllerFor('articles'),
          'article',
        );
      } else {
        return this.performDataRefresh(
          'by_model_name_erlang/all_community_articles',
          this.controllerFor('articles'),
          'article',
        );
      }
    },
    actions: {
      willTransition: function (transition) {
        if (transition.intent.name !== 'articles') {
          this.controllerFor('events').set('headerBottomShown', false);
        }
      },
    },
  },
);
