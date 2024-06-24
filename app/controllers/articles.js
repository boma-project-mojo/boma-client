import Controller, { inject as controller } from '@ember/controller';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import GoToRouteMixin from '../mixins/go-to-route';
import ENV from 'boma/config/environment';
import { later } from '@ember/runloop';
import IsDataLoading from '../mixins/is-data-loading';

export default Controller.extend(GoToRouteMixin, IsDataLoading, {
  applicationController: controller('application'),

  articleModal: false,
  articleModalModel: null,

  preferenceToggle: service('preference-toggle'),

  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  filterService: service('filter'),

  searchKeyword: alias('filterService.searchKeyword'),
  selectedTags: alias('filterService.selectedTags'),

  persistentSelectedTags: alias('filterService.persistentSelectedTags'),
  selectedExcludedTags: alias('filterService.selectedExcludedTags'),
  selectedCreator: alias('filterService.selectedCreator'),

  featuredSelected: alias('filterService.featuredSelected'),

  hasArticles: computed('model.articles.length', function () {
    return this.model && this.model.articles.length > 0;
  }),

  /* 
   * displayFormat 
   * 
   * List and single-column display formats are available for articles.  
   * 
   * Returns the display format being used based on the articleType query param 
   * 
   * This is used to define the articleListComponent below and also passed to ember collection for
   * the purposes of calculating the layout.  
   */
  displayFormat: computed('articleType', function () {
    if (
      this.articleType === 'community_article' ||
      this.articleType === 'boma_news_article'
    ) {
      return null;
    } else if (this.articleType === 'boma_audio_article') {
      return 'list';
    } else {
      return 'single-column';
    }
  }),
  /* 
   * articleListComponent 
   * 
   * Returns the component name to be used when rendering the
   * list using the specified `displayFormat`
   */
  articleListComponent: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      return 'app-article-list-style';
    } else {
      return 'app-article';
    }
  }),
  /* 
   * articleModalComponent 
   * 
   * Returns the component to used when displaying the full content for an article in the modal.  
   */
  articleModalComponent: computed('articleType', function () {
    if (this.articleType === 'community_article') {
      return 'community-notice-detail';
    } else {
      return 'article-detail';
    }
  }),

  queryParams: [
    'pageName',
    'articleType',
    'selectedCreator',
    'selectedTags',
    'tagType',
    'searchKeyword',
    'selectedYears',
    'featuredSelected',
    'selectedExcludedTags',
    'goBack',
    'persistentSelectedTags',
    'articleModal',
  ],

  /*
   * Render the right sidebar if:
   * - a tagType is included in the query params and no persistentSelectedTags are set
   * - this view is showing the isCommunityNoticeboard
   *
   * If using the persistentSelectedTags attribute this view is being used to show one or more tags.
   * Including the option to select other tags is confusing because it's likely the user is expecting
   * only to see articles for this one tag because of menu name and page title.  As such, hide the right sidebar.
   */
  renderRightSidebar: computed(
    'isCommunityNoticeboard',
    'persistentSelectedTags.length',
    'tagType',
    function () {
      return (
        (this.tagType && this.persistentSelectedTags.length === 0) ||
        this.isCommunityNoticeboard
      );
    },
  ),

  isCommunityNoticeboard: equal('articleType', 'community_article'),

  // Article lists can be configured to open a URL rather than a modal.  
  // TODO:  'wild_at_home' was the article type used for this during rapid
  //        prototyping in COVID and the system has not been used since.  
  //        either refactor to be generic or remove.  
  isLinkGallery: equal('articleType', 'boma_wild_at_home_article'),

  /* 
   * filtersSetClass
   *
   * returns a class name to allow styling header glyphs if the filters are set.  
   */
  filtersSetClass: computed(
    'featuredSelected',
    'selectedTags.length',
    function () {
      if (this.selectedTags.length > 0 || this.featuredSelected === true) {
        return 'filters-set';
      }
      return '';
    },
  ),

  /* 
   * creators
   *
   * Used when filtering community noticeboard articles (People's Gallery) by who created
   * the post.  
   */
  creators: computed(function () {
    return [
      { id: '', name: 'Anyone' },
      { id: 1, name: 'Me' },
    ];
  }),

  audioPlayer: service('audio-player'),
  currentMediaModelID: alias('audioPlayer.currentMediaModelID'),
  currentMediaModelName: alias('audioPlayer.currentMediaModelName'),
  currentMediaIsPlaying: alias('audioPlayer.currentMediaIsPlaying'),
  audioTagID: ENV['articleAudioTagId'],
  // Required to navigate from the articles list to a playing audio article.  
  audio_id_as_array: computed('audioTagID', function () {
    return [String(this.audioTagID)];
  }),

  actions: {
    /* 
     * openArticleModal()
     *
     * Opens the article modal
     * 
     * articleID      int       The id of the article.  
     */
    openArticleModal: function (articleID) {
      this.set('articleModal', true);
      this.set('articleModalModelID', articleID);
    },
    /* 
     * closeArticleModal()
     *
     * Closes the article modal
     */
    closeArticleModal: function () {
      // If an image is being zoomed using the pinch gestures then ignore this
      // this is to avoid panning of a zoomed image accidentally triggering the 
      // close Modal swipe gesture.  
      if(this.isZoomingImage === true){
        return;
      }

      var self = this;
      if (this.goBack === 'true') {
        history.back();
      } else {
        self.set('articleModal', false);
        self.set('articleModalModel', null);
        self.set('articleModalModelID', null);
      }
    },
    /* 
     * clearFilters()
     *
     * Clears all filters.
     */
    clearFilters: function () {
      this.set('selectedTags', []);
      this.set('selectedCreator', null);
      this.set('featuredSelected', false);
      window.rightSidebar.close();
    },
    /* 
     * favouriteArticle()
     *
     * Add the article to the list of those preferred.  
     * 
     * articleID      int       The id of the article.  
     */
    favouriteArticle: function (articleID) {
      this.preferenceToggle.togglePreference('article', articleID);
    },
  },
});
