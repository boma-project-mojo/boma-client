/* jshint node: true */

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'boma',
    environment: environment,
    rootURL: '',
    locationType: 'hash',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false,
      },
    },
    moment: {
      includeTimezone: 'all',
    },

    fontawesome: {
      defaultPrefix: 'fas', // light icons
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },

    viewportConfig: {
      viewportEnabled: false,
      viewportUseRAF: true,
      viewportSpy: false,
      viewportScrollSensitivity: 1,
      viewportRefreshRate: 100,
      viewportListeners: [],
      intersectionThreshold: 0,
      scrollableArea: '.cf-container',
      viewportTolerance: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
    },

    'ember-local-storage': {
      loadInitializer: false,
    },
  };

  // Console logs for the purposes of debugging
  // use the appropriate integer to set desired the log level
  // ERROR    = 0
  // WARNING  = 1
  // INFO     = 2
  // DEBUG    = 3
  ENV.logLevel = 0;

  // This app's organisation id
  ENV.organisationId = null;
  // This app's festival id.  If there is no default festival leave this blank.
  ENV.festivalId = null;
  // Soon to be superseeded.
  ENV.articleAudioTagId = [];
  // The filename of the messages.json file.  This is a failsafe for syncing `notifications` stored in localstorage with those sent to all users.  They should be synced on 'notification' callback see services/notifications.js#122
  ENV.messagesJSONFileName = 'messages.json';
  // Multi festival app mode enables an additional menu in the left sidebar which allows users to change the festival context of the app.
  ENV.multiFestivalApp = false;
  // This is the image that will be used if a new event / venue is created after the bundle has been created and there is no network to cache the new image or load the image from s3.    See services/images.js#49 for more.
  ENV.fallbackImageFileName = 'splash.jpg';
  // If loading from bundle
  ENV.bundleVersion = 1;
  // If enabled this triggers the preloading of community articles when the app is bootstrapping
  ENV.communityArticlesEnabled = true; // set as true to enable community articles data cache and community articles menu item
  // If enabled this triggers the preloading of community events when the app is bootstrapping
  ENV.communityEventsEnabled = true; // set as true to enable community events data cache and community events menu item
  // This is the route the app opens up to when it is in 'festival' mode.  Festival mode is triggered by start and end dates set on the
  // festival model and stored on the pouchdb record for that festival.
  ENV.festivalHome = {
    routeName: 'events',
    params: { viewType: null, pageName: null },
  }; // the route
  // This is the route the app opens up to when it is in 'community' mode.  Community mode is triggered when outside of the 'festival mode' start
  // and end dates set on the festival model and stored on the pouchdb record for that festival.
  ENV.communityHome = {
    routeName: 'articles',
    params: {
      articleType: 'boma_article',
      selectedTags: '',
      selectedExcludedTags: ENV['articleAudioTagId'],
      pageName: 'News',
      tagType: '',
    },
  };
  // Events filters can be configured to use either 'producion' tags (those that are applied to the related production records)
  // or 'event' tags (those that are applied to the event itself).  This defaults to 'production'.
  ENV.eventFilterTagType = 'production'; // should be event or production
  // Order events by alphanumeric or cronologically
  ENV.eventOrder = 'start_time'; //should be "name", "productions_names" or "start_time"
  // If enabled the wallet is hidden in the left-sidebar menu and shown in the settings page.
  ENV.subtleWallet = false;
  // If 'Short Descriptions' are provided for events then they can be used to show less wordy copy for accessiblity purposes.
  ENV.enableLessWordyCopy = true;
  // Map Config
  ENV.mapConfig = {
    // The URL to the vector tiles style.json
    vectorMapTilesStyleURL:
      'https://maps.boma.community/styles/basic-preview/style.json',
    // The base of the filename without the incrementing number, i.e in map_01.jpg would be map_0
    imageFilenameBase: 'map',
    // The file extension, i.e for map_01.jpg this would be jpg
    imageFilenameExt: 'jpg',
    // These are the four co-ordinates for the four extreme corners of the overlay image
    xtop: '',
    xright: '',
    xbottom: '',
    xleft: '',
  };
  ENV.privacyPolicyURL = "https://boma.community/privacy.html";
  // Deprecated.  Enables the offlineMode which was implemeted for Shambino.
  ENV.offlineModeEnabled = false;

  ENV.emberPouch = {};
  ENV.emberPouch.dontsavehasmany = true;

  if (environment === 'development') {
    ENV.apiUrl = 'http://localhost:3000'; // The base URL for the boma API
    ENV.activityAPI = 'http://localhost:3000'; // The base URL for the boma activity API
    ENV.couchUrl = 'http://localhost:5984'; // The base URL for the couchdb instance
    ENV.emberPouch.localDb = 'kambe_events_1'; // The couchdb database name for the couchdb instance
    ENV.messagesS3Bucket = 'https://boma-staging-messages.s3.amazonaws.com/festivals/'; // The full URL to the messages blob used for syncing push notifications
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {
    ENV.apiUrl = ''; // The base URL for the boma API
    ENV.activityAPI = ''; // The base URL for the boma activity API
    ENV.couchUrl = ''; // The base URL for the couchdb instance
    ENV.emberPouch.localDb = ''; // The couchdb database name for the couchdb instance
    ENV.messagesS3Bucket = ''; // The full URL to the messages blob used for syncing push notifications
  }

  ENV.apiEndpoint = ENV.apiUrl + '/api/v1/';
  ENV.activityAPIEndpoint = ENV.activityAPI + '/api/v1/';

  ENV.emberPouch.remoteDb = ENV.couchUrl + '/' + ENV.emberPouch.localDb;

  ENV.suggestionUrl = ENV.apiUrl + '/api/v1/suggestions';

  ENV.validateOwnTokenURL = ENV.apiUrl + '/api/v1/validate-token';
  ENV.getWalletTokensURL = ENV.apiUrl + '/api/v1/get-tokens-by-address';

  return ENV;
};
