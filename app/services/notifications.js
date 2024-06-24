/* 
 Notifications Service

 This service handles all methods relating to push notifications including:-

 - handling events when tokens are registered
 - handling events when a user clicks on a notification
 - handling events on error
 - keeping localstorage records of notifications up to date
*/

import Service from '@ember/service';
import { inject as service } from '@ember/service';
import ENV from 'boma/config/environment';
import { alias } from '@ember/object/computed';
import config from '../config/environment';

export default Service.extend({
  apiEndpoint: ENV['apiEndpoint'],
  settingsService: service('settings'),
  store: service('store'),
  pouchDb: service('pouch-db'),

  festivalId: ENV['festivalId'],
  organisationId: ENV['organisationId'],

  appVersion: config.APP.version,
  walletAddress: null,

  registrationId: null,
  registrationType: null,

  push: null,

  router: service('router'),
  /* 
   * initializePushNotification()
   * 
   * Inits PushNotification and sets up the events for handling token registration, the action when clicking on
   * notifications and the error callback.  
   * 
   * @walletAddress       hex       The public key for this wallet
   */
  initializePushNotification(walletAddress) {
    this.push = PushNotification.init({
      android: {},
      ios: {
        alert: 'true',
        badge: true,
        sound: 'true',
      },
    });

    this.walletAddress = walletAddress;

    this.clearBadgeNumber(null, false);
    this.handleTokenRegistration();
    this.createChannel();
    this.initialiseOnNotification();
    this.initialiseOnError();
  },

  /* 
   * initializeLocalNotifications()
   * 
   * Inits Local Notifications and sets up the the action when clicking on
   * notification.  
   */
  initializeLocalNotifications(){
    var self = this;
    if (
      window.cordova !== undefined &&
      typeof window.cordova.plugins.notification !== 'undefined'
    ) {
      cordova.plugins.notification.local.on('click', function (notification) {
        self.handleNotificationData(notification);
      });
    }
  },
  
  /* 
   * handleTokenRegistration()
   *
   * Sets up the 'registration' event for the push plugin which is triggered when a token is registered.  
   */
  handleTokenRegistration() {
    this.push.on('registration', (data) => {
      // This callback fires twice immediately on some iOS devices.
      // If the registrationId stored on this service and the one returned are the same then 
      // we can safely skip updateRemoteAddressRecord().  
      if (this.registrationId === data.registrationId) {
        return;
      }

      // Get the registration token
      this.registrationId = data.registrationId;
      // Get the registration type (either FCM for Android or APNS for iOS)
      this.registrationType = data.registrationType;
      // Check to see whether the app settings have been initialised.  
      this.settingsService.hasExistingSettings().then((hasExistingSettings) => {
        // If there are settings
          // Go ahead and update the remote record
        // else
          // Initialise the settings and then update the remote record. 
        if (hasExistingSettings) {
          this.updateRemoteAddressRecord(this.walletAddress);
        } else {
          this.settingsService.initialiseSettings(true).then(() => {
            this.updateRemoteAddressRecord(this.walletAddress);
          });
        }
      });
    });
  },
 
  /* 
   * updateRemoteAddressRecord()
   *
   * Updates the remote record when a push notification token (FCM or APNS) is registered.  
   * 
   * @walletAddress       hex       The public key for this wallet
   * @notification_id     int       The id of the notification which triggered this action
   */
  updateRemoteAddressRecord(walletAddress, notification_id) {
    var self = this;

    let deviceDetails = {};

    // If cordova get store the device details
    if (window.cordova) {
      if (device) {
        deviceDetails = {
          platform: device.platform,
          version: device.version,
          model: device.model,
          manufacturer: device.manufacturer,
        };
      }
    }

    // Get all settings ready to send and send
    self.settingsService.getAllSettingsAsJSON().then((settings) => {
      // Send a request to the server to update the remote address record.  
      $.ajax(self.apiEndpoint + 'create-or-update-address', {
        method: 'POST',
        data: {
          address: walletAddress,
          registration_id: self.get('registrationId'),
          registration_type: self.get('registrationType'),
          settings: JSON.stringify(settings),
          app_version: self.get('appVersion'),
          notification_id: notification_id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          organisation_id: self.get('organisationId'),
          festival_id: self.get('festivalId'),
          device_details: JSON.stringify(deviceDetails),
        },
      })
        .then((response) => {
          console.log('Notification update status', response);
        })
        .catch((err) => {
          console.log('Err: updateRemoteAddressRecord', err);
        });
    });
  },

  /* 
   * clearBadgeNumber()
   *
   * @notification_id       int     the notification_id that triggered this
   * @updateRemoteRecord    bool    set to true to update the remote record for this address
   * 
   * Return the badge number (on the app icon) to zero
   */
  clearBadgeNumber(notification_id, updateRemoteRecord = true) {
    this.push.setApplicationIconBadgeNumber(
      () => {
        if (updateRemoteRecord) {
          this.updateRemoteAddressRecord(this.walletAddress, notification_id);
        }
      },
      (err) => {
        console.log(err);
      },
      0,
    );
  },

  /* 
   * createChannel()
   *
   * Create a notification channel (required for Android O and above)
   */
  createChannel() {
    PushNotification.createChannel(
      () => {
        //success
      },
      (err) => {
        console.log(err);
      },
      {
        id: 'boma_notification',
        description: 'Boma notifications channel',
        importance: 4,
        vibration: true,
        lightColor: parseInt('FF0000FF', 16).toString(),
        light: true,
        sound: 'ding',
      },
    );
  },

  /* 
   * initialiseOnNotification()
   *
   * Initialise the event triggered when a notification is clicked.  
   */
  initialiseOnNotification() {
    this.push.on('notification', (notification) => {
      self.handleNotificationData(notification);
      // Don't update remote record - it's already been done.
      this.clearBadgeNumber(notification, false);
    });
  },

  /* 
   * initialiseOnError()
   *
   * Initialise the event triggered when an error occurs with push plugin.  
   */  
  initialiseOnError() {
    this.push.on('error', function (e) {
      console.log('push error = ' + e.message);
    });
  },

  /*
   * handleNotificationData()
   *
   * Handle click for both local notifications and push notifications
   * notification (json)
   * 
   * @payload       json        payload which is sent with the notification
   */
  async handleNotificationData(payload) {
    // disabling eventual consistency allows this method to wait for a response from pouchdb to complete before progressing.  If eventual consistency is
    // enabled then this promise will wait for eternity to resolve.
    // See https://github.com/pouchdb-community/ember-pouch#eventually-consistent
    //
    // this is required for when notifications are linked to a model, we load the document before creating the notification to ensure that
    // the link through to the related model works.
    ENV.emberPouch.eventuallyConsistent = false;

    var data, notification;

    if (payload.additionalData) {
      data = payload.additionalData;
    } else if (payload.data) {
      data = payload.data;
    }

    var self = this;

    // Notifications belong to festivals, load the festival and
    // change the app Festival context to the appropriate context
    // for this festival.
    var festivalId = data.festival_id;
    if (festivalId != '') {
      var festival = await self.store.findRecord('festival', festivalId);
      await self.pouchDb.changeFestival(festival);
    } else {
      await self.pouchDb.createDb();
    }

    if (
      payload.meta &&
      payload.meta.plugin &&
      payload.meta.plugin === 'cordova-plugin-local-notification'
    ) {
      /*
       ****** Local notifications ******
       * Local notification message records are created / destroyed
       * when preferences are created / destroyed, just navigate to the
       * messages feed and scrollTo and identify the appropriate message
       */

      let query = await this.store.query('notification', {
        filter: {
          notification_id: data.notification_id,
        },
      });
      notification = query[0];
    } else {
      // Reject this callback if it has been triggered by someone tapping a notification.
      // This is to prevent duplicate 'notification' records being created in the local storage.
      // There's a silent data message which will be handled instead.
      if (
        payload.coldstart === true ||
        (payload.additionalData && payload.additionalData.coldstart === true)
      ) {
        return;
      }

      /*
       ****** Push Notifications ******
       * If the notification is a push notification use the
       * notification data to push a message record in the local
       * database.
       */

      let notificationData = {
        notification_id: parseInt(data.api_message_id),
        festival_id: data.festival_id,
        subject: data.notification_subject,
        body: data.notification_body,
        sent_at: moment(),
        notification_type: 'push',
      };

      // If there is a related model load it, if it's not already synced then
      // load the individual doc for couchdb and then load it.
      var model;
      if (data.article_id) {
        try {
          model = await this.store.findRecord('article', data.article_id);
        } catch (err) {
          await this.pouchDb.loadDoc(`article_2_${data.article_id}`);
          model = await this.store.findRecord('article', data.article_id);
        }
      } else if (data.event_id) {
        try {
          model = await this.store.findRecord('event', data.event_id);
        } catch (err) {
          await this.pouchDb.loadDoc(`event_2_${data.event_id}`);
          model = await this.store.findRecord('event', data.event_id);
        }
      }

      notification = await this.createOrUpdateNotification(
        notificationData,
        model,
      );

      // Required for iOS background notifications
      // more https://github.com/havesource/cordova-plugin-push/blob/master/docs/PAYLOAD.md#background-notifications-1
      this.push.finish(
        () => {
          //success
        },
        (err) => {
          console.log(err);
        },
        data.api_message_id,
      );
    }

    // Redirect to messages route
    this.router.transitionTo('messages', {
      queryParams: { notification_id: notification.notification_id },
    });

    // reenable eventual consistently.
    ENV.emberPouch.eventuallyConsistent = true;
  },

  /*
   *  createOrUpdateNotification()
   * 
   *  @notificationData       json                  The data object sent with the push notification.
   *  @model                  Ember Data Object     The Ember Data model related to the notification (event or article)
   * 
   *  Create a new or update an existing message record in the local db
   *  message (obj)
   */
  async createOrUpdateNotification(notificationData, model = null) {
    notificationData = this.constructModelandRoute(model, notificationData);

    var query, notification;
    query = await this.store.query('notification', {
      filter: {
        notification_id: notificationData.notification_id,
      },
    });
    if (query.length > 0) {
      notification = await query[0].setProperties(notificationData);
      await query[0].save();
    } else {
      notification = await this.store.createRecord(
        'notification',
        notificationData,
      );
      notification = await notification.save();
    }

    return notification;
  },

  /*
   *  deleteNotification()
   *
   *  @notificationId     int     The notification ID which need to be deleted. 
   * 
   *  Delete an existing message record
   */
  async deleteNotification(notificationId) {
    var notifications, notification;

    notifications = await this.store.findAll('notification');

    notification = notifications.find(function (n) {
      return parseInt(n.get('notification_id')) === parseInt(notificationId);
    });

    if (notification) {
      notification.deleteRecord();
      await notification.save();
    }
  },

  /*
   * constructModelandRoute()
   *
   * To enable linking to related models from the notifications screen this 
   * method constructs the data object containing the model and route
   * 
   * @model       Ember Data Object       The related model
   * @data        json                    The data sent with the notification       
   */
  constructModelandRoute(model, data) {
    // If there is a related model
      // construct the data object with the model, model id, route, route params and 
      // name or title
    // else
      // nullify these attributes. 
    if (model) {
      data.notifiable_model = model.constructor.modelName;
      data.notifiable_id = model.id;
      data.notifiable_route = this.getRoute(model);
      data.notifiable_params = this.getParams(model);
      if (model.name) {
        data.notifiable_name = model.name;
      } else if (model.title) {
        data.notifiable_name = model.title;
      }
    } else {
      // Handles the case where an associated model is deleted
      // but the notification isn't
      data.notifiable_route = null;
      data.notifiable_params = null;
      data.notifiable_name = null;
      data.notifiable_name = null;
    }
    return data;
  },

  /*
   * getRoute()
   *
   * Construct the route from the model
   * 
   * @model       Ember Data Object       The related model 
   */
  getRoute(model) {
    var route;
    if (model.constructor.modelName === 'event') {
      if (model.is_community_event === true) {
        route = 'community-events';
      } else {
        route = 'events';
      }
    } else if (model.constructor.modelName === 'production') {
      route = 'events';
    } else if (model.constructor.modelName === 'article') {
      route = 'articles';
    }
    return route;
  },

  /*
   * getParams()
   *
   * Construct the route params from the model
   * 
   * @model       Ember Data Object       The related model 
   */
  getParams(model) {
    var self = this;
    var params;
    if (model.constructor.modelName === 'event') {
      var festival = self.store.peekRecord('festival', model.festival_id);

      if (festival.schedule_modal_type === 'event') {
        params = {
          eventModal: true,
          eventModalModelID: model.id,
          goBack: true,
        };
      } else if (festival.schedule_modal_type === 'production') {
        params = {
          productionModal: true,
          productionModalModelID: model.production_id,
          goBack: true,
        };
      }
    } else if (model.constructor.modelName === 'article') {
      // Later -> pageName, selectedExcludedTags, tagType need to be added
      params = {
        articleModal: true,
        articleModalModelID: model.id,
        articleType: model.article_type,
        goBack: true,
      };
    }
    return params;
  },

  /*
   * Sync Remote Notifications JSON with the local db
   * 
   * @festival_id       int       The festival id
   */
  currentFestivalID: alias('pouchDb.currentFestivalID'),

  async syncRemoteNotificationJSON(festival_id) {
    var notification,
      updatedNotifications = [],
      model;

    // Get the JSON object for this festival containing all public notifications from the s3 location.
    let doc = await $.ajax({
      url: `${ENV['messagesS3Bucket']}${festival_id}/${ENV['messagesJSONFileName']}`,
      timeout: 10000,
      dataType: 'json',
    });

    // 'Eventual consistency' means this store waits for pouchdb to return a record before 
    // allowing code execution to continue.  
    // 
    // We don't want to do this because if the model we're finding below doesn't 
    // exist we are just handling the error.  
    ENV.emberPouch.eventuallyConsistent = false;

    // For each push notification 
    for (const pn of doc.messages) {
      model = null;
      // If it relates to a event model
        // load the model
      // or If it relates to a article model
        // load the model
      if (pn.article_id) {
        try {
          model = await this.store.findRecord('article', pn.article_id);
        } catch (err) {
          console.log(err);
        }
      } else if (pn.event_id) {
        try {
          model = await this.store.findRecord('event', pn.event_id);
        } catch (err) {
          console.log(err);
        }
      }

      // Construct a JSON object to pass to the method to create a local notification
      let notificationData = {
        notification_id: parseInt(pn.id),
        festival_id: festival_id,
        subject: pn.subject,
        body: pn.body_with_anchors,
        sent_at: pn.sent_at,
        notification_type: 'push',
      };

      // Create or update a notification object in localstorage for this notification
      notification = await this.createOrUpdateNotification(
        notificationData,
        model,
      );

      // Store the updated Push notification to be used when cleaning up below
      updatedNotifications.push(notification.notification_id);
    }

    // Re-enable `eventuallyConsistent` 
    ENV.emberPouch.eventuallyConsistent = true;

    // Cleanup any notifications that have been removed from the server
    // Disabled because if message JSON isn't updated in time then the message is deleted.
    // let allNotifications = await this.store.findAll('notification');
    // let allPushNotifications = allNotifications.filter(function(n){
    //   return n.get('notification_type') === 'push';
    // });

    // let allPushNotificationIDs = allPushNotifications.map((pn)=>pn.notification_id);

    // deletedNotifications = allPushNotificationIDs.filter( ( el ) => !updatedNotifications.includes( el ) );

    // for (const deletedNotification of deletedNotifications) {
    //   await this.deleteNotification(deletedNotification)
    // }
  },
});
