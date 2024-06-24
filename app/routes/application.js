import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { alias } from '@ember/object/computed';
import config from '../config/environment';
import { versionRegExp } from 'ember-cli-app-version/utils/regexp';

export default Route.extend({
  appVersion: config.APP.version.match(versionRegExp)[0],
  state: service(),
  router: service(),
  pouchDb: service('pouch-db'),
  store: service(),
  settings: service(),
  animations: service(),

  festivalId: alias('pouchDb.currentFestivalID'),

  isTransitioning: false,
  firstTransition: true,

  init: function () {
    this._super(...arguments);

    this.router.on('routeDidChange', () => {
      // Finishing the animations that were started either by the application load
      // (where #loading-screen has neither .loading-hidden or .loading-removed classes)
      // or
      // by the go-to-route mixin
      // or
      // by the app-left-sidebar goToRoute() method

      var self = this;

      // Routes always reload to show the latest data so to prevent double transitions
      // make sure there isn't an animation taking place
      if (this.isTransitioning === false) {
        this.set('firstTransition', false);
        this.set('isTransitioning', true);

        // Add the loading hidden class which starts the animation to fade out the
        // #loading-screen
        setTimeout(() => {
          $('#loading-screen').addClass('loading-hidden');
          $('body').addClass('loading-hidden');
        }, 1);
        // Remove the #loading-screen
        setTimeout(() => {
          $('#loading-screen').addClass('loading-removed');
          self.set('isTransitioning', false);
        }, 1100);
      }
    });
  },

  async model() {
    // Get published and preview festivals
    let festivals = await this.store.findAll('festival')
    festivals = festivals.filter((f)=>{
      if (f.aasm_state != 'draft') {
        return f;
      }
    })

    return hash({
      // event preferences
      preferences: this.store.findAll('preference'),
      festivals: festivals,
      // required to trigger application adapter which initialises pouchdb
      pages: this.store.findAll('page'),
      // tokens used to check if this app is in preview mode
      tokens: this.store.query('token2', { filter: { aasm_state: 'mined' } }),
      // accessibility setting for displaying the app in large print
      largerText: this.settings.getSetting('larger-text'),
    });
  },

  afterModel(model, transition) {
    if (window.cordova !== undefined) {
      // fire the on('notification') events for local notifications
      // (these are held up in the cordova initialiser until the app is ready to handle them).
      if (
        window.cordova !== undefined &&
        typeof window.cordova.plugins.notification !== 'undefined'
      ) {
        window.cordova.plugins.notification.local.fireQueuedEvents();
      }
    }

    /*
     * The following handles transitioning the user to the most appropriate route when they first open the app.
     * This is based on the app config and the user's previous interactions with the app.
     *
     * The following cases are handled
     * 1.  A user has never loaded the app before and should see the welcome screen
     * 2.  In multi festival app mode - the user has clicked through the welcome screen but not selected a festival or the default festival is no longer published
     * 3.  If the app has been opened from a custom URL scheme and relates to a redeemable token navigate to the
     *     redeem token page
     * 4.  If the user has previously loaded the app navigate to the appropriate 'home' route for the current appMode
     */

    // If this user has already seen the welcome screen the following localstorage item will be set to true
    const hasLoadedBefore = localStorage.getItem(
      `hasLoadedBefore-welcome-${this.state.majorAppVersion}`,
    );
    // Get the current festival id, set in the pouchdb initialise function.
    let currentFestivalID = localStorage.getItem('currentFestivalID');

    // Transition the user to the appropriate route.
    // If the target route is 'splash' there's no need to navigate.
    if (transition.targetName !== 'splash') {
      if (
        (transition.targetName === 'index' && hasLoadedBefore !== 'true') ||
        currentFestivalID === null
      ) {
        // If this user has never loaded the app before go to Welcome
        this.router.transitionTo('splash', {
          queryParams: { type: 'welcome' },
        });
      } else if (
        config.multiFestivalApp === true &&
        transition.targetName === 'index' &&
        this.festivalId === null
      ) {
        // If it's a multi festival app with no default festival go the festivals index.
        this.router.transitionTo('festivals');
      } else if (transition.targetName === 'index') {
        if (
          window.handleOpenURLParams &&
          window.handleOpenURLParams.get('claimTokenNonce')
        ) {
          // The app uses cordova-plugin-customurlscheme to a token to be redeem by clicking a link.
          // If this is the case navigate to the redeem-token path.
          this.router.transitionTo('redeem-token', {
            queryParams: {
              claimTokenNonce:
                window.handleOpenURLParams.get('claimTokenNonce'),
            },
          });
        } else {
          // Get the current festival ember data object from the model
          let currentFestival = model.festivals.filter(
            (f) => f.id === currentFestivalID,
          ).firstObject;
          // Calculate whether the app is in 'festival' or 'community' mode.
          let appMode = this.pouchDb.calculateFestivalMode(currentFestival);

          if (
            currentFestival === undefined ||
            (currentFestival.aasm_state !== 'published' &&
              currentFestival.aasm_state !== 'preview')
          ) {
            // If the current festival has been unpublished return users to the festivals index.
            this.router.transitionTo('festivals');
          } else {
            // Otherwise transition the user to the configured route for the current appMode.
            if (appMode === 'community') {
              this.router.transitionTo(config.communityHome.routeName, {
                queryParams: config.communityHome.params,
              });
            } else {
              this.router.transitionTo(config.festivalHome.routeName, {
                queryParams: config.festivalHome.params,
              });
            }
          }
        }
      }
    }

    this._super(...arguments);
  },
  setupController(controller, model) {
    // The following logic decides whether an update nag should be shown in the app.  
    // If there are festival records and the latest one includes the `current_app_version`
    // attribute
    if (
      model.festivals[0] &&
      model.festivals[0].current_app_version &&
      this.state.appVersion
    ) {
      // Get the current version of the production app according to the couchdb festival records.   
      let currentVersion = model.festivals[0].current_app_version;
      // Get the installed version.  
      let installedVersion = this.appVersion;

      // Check if we're up to date.  
      let isUpToDate = currentVersion.localeCompare(
        installedVersion,
        undefined,
        { numeric: true, sensitivity: 'base' },
      );

      let msg = `(${installedVersion} is installed, latest production release is ${currentVersion})`;

      // If up to date
        // Show nothing to user
      // If ahead of production
        // Show nothing to user
      // If behind production
        // Show the update nag and populate the appropriate attributes
        // to be able to show a direct link to the app stores.  
      if (isUpToDate === 0) {
        console.log(
          `%c App UP-TO-DATE ${msg} `,
          'background-color: green; color: white;',
        );
      } else if (isUpToDate === -1) {
        console.log(
          `%c App AHEAD OF PRODUCTION ${msg} `,
          'background-color: darkOrange; color: white;',
        );
      } else if (isUpToDate === 1) {
        controller.set('showUpdateNag', true);
        controller.set('bundleId', model.festivals[0].app_bundle_id);
        controller.set('appleAppId', model.festivals[0].apple_app_id);
        console.log(
          `%c App OUT-OF-DATE ${msg} `,
          'background-color: red; color: white;',
        );
      }
    }
    this._super(controller, model);
  },
  actions: {
    loading() {
      // Disable the default ember loading function
      // https://guides.emberjs.com/release/routing/loading-and-error-substates/
    },
    didTransition: function () {
      // Finishing the animations that were started either by the application load
      // (where #loading-screen has neither .loading-hidden or .loading-removed classes)
      // or
      // by the go-to-route mixin
      // or
      // by the app-left-sidebar goToRoute() method

      if (this.isTransitioning === false && this.firstTransition === true) {
        this.set('isTransitioning', true);
        this.set('firstTransition', false);
        this.animations.hideSplash();
        this.set('isTransitioning', false);
      }
    },
    reloadModel: function () {
      this.refresh();
    },
  },
});
