import { computed } from '@ember/object';
import { alias, reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller from '@ember/controller';
import ENV from 'boma/config/environment';
import { later } from '@ember/runloop';

export default Controller.extend({
  router: service('router'),
  tokenService: service('token'),
  headerService: service('header'),
  settingsService: service('settings'),
  notificationsService: service('notifications'),
  activityService: service('activity'),
  animationsService: service('animations'),
  pouchDb: service('pouch-db'),
  flashService: service('flash'),
  fireForSure: service('fire-for-sure'),

  apiEndpoint: ENV['apiEndpoint'],
  subtleWallet: ENV['subtleWallet'],

  loadingScreenMessage: alias('animationsService.loadingScreenMessage'),

  headerShown: alias('headerService.headerShown'),

  // This class is required when the header is hidden from view when scrolling. 
  // See animations.css#106 for a more complete explanation.  
  headerBottomShown: alias('headerService.headerBottomShown'),
  headerBottomShownClassForWrap: computed('headerBottomShown', function () {
    if (this.headerBottomShown === true) {
      return 'header-bottom-shown';
    }
    return '';
  }),

  headerShownClass: computed('headerShown', function () {
    if (this.headerShown === false) {
      return 'header-hidden';
    }
    return '';
  }),

  preferenceToggle: service('preference-toggle'),

  QRScanner: service('qr-scanner'),
  QRScannerShown: alias('QRScanner.shown'),

  festivalId: alias('pouchDb.currentFestivalID'),
  currentFestival: alias('pouchDb.currentFestivalDbName'),

  audioTagID: ENV['articleAudioTagId'],

  flashShown: alias('flashService.flashShown'),
  flashClass: alias('flashService.flashClass'),
  flashMessage: alias('flashService.flashMessage'),
  flashLeaving: alias('flashService.flashLeaving'),

  showUpdateNag: false,
  bundleId: null,

  currentRouteName: reads('router.currentRouteName'),

  init() {
    this._super();

    // Get the wallet
    this.tokenService.getWallet().then((wallet) => {
      this.set('wallet', wallet);

      // Setup push notifications
      this.setupPushNotifications();

      // After a short timeout to help with distributing requests to the 
      // servers, initialize the activity and then report activity to the server.  
      later(() => {
        this.activityService.initActivity();
        this.activityService.reportActivity(wallet.address);
      }, 500);

      // If subtleWallet is enabled skip updating tokens at this point as it's
      // unlikely they are being used for this iteration of the app.
      //
      // This will reduce the number of unnecessary requests to the API.
      //
      // Tokens are updated beforeModel on the wallet route as a fail safe.
      if (this.subtleWallet != true) {
        this.fireForSure.tryAndTryAgain().finally(() => {
          this.tokenService.syncWalletTokens(wallet.address);
        });
      }
    });

    // Setup local notifications
    this.notificationsService.initializeLocalNotifications();

    // Initialise the pouchDb
    later(() => {
      this.pouchDb.initialise();
    });
  },

  setupPushNotifications() {
    var self = this;

    // Useful for debugging
    // if(window.cordova === undefined){
    //   self.settingsService.getAllSettingsAsJSON().then((settingsJSON)=>{
    //     return $.ajax(self.apiEndpoint+"create-or-update-address", {
    //       method: 'POST',
    //       data: {
    //         address: self.get('wallet.address'),
    //         registration_id: 'not-real',
    //         registration_type: 'fake',
    //         settings: JSON.stringify(settingsJSON),
    //         app_version: self.get('appVersion'),
    //         timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    //         organisation_id: ENV['organisationId'],
    //         festival_id: ENV['festivalId']
    //       }
    //     }).then((response)=>{
    //       console.log("fcm_token update status", response, self.get('wallet.address'));
    //     });
    //   });
    // }

    if (window.cordova !== undefined) {
      this.notificationsService.initializePushNotification(
        self.get('wallet.address'),
      );
    }
  },

  isEvents: false,
  isEventsClass: computed('isEvents', function () {
    if (this.isEvents === true) {
      return 'is-events';
    }
    return '';
  }),

  rightSidebarShown: false,
  rightSidebarShownClass: computed('rightSidebarShown', function () {
    if (this.rightSidebarShown === true) {
      return 'right-sidebar-shown';
    }
    return '';
  }),
});
