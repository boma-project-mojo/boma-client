/* 
Preference Service

This service handles the creating and deleting of 
 - Local Push Notifications (which are handled using https://github.com/boma-digital/cordova-plugin-local-notification)
 - Local records of Notifications stored in local storage which are displayed on the 'messages' route.  
*/

import Service, { inject as service } from '@ember/service';
import $ from 'jquery';
import ENV from 'boma/config/environment';
import { later } from '@ember/runloop';

export default Service.extend({
  store: service('store'),
  settings: service('settings'),
  activity: service('activity'),
  notificationsService: service('notifications'),
  beat: false,

  /* 
   * refreshPreference()
   *
   * Recreate the preference and associated local notification and notification record in 
   * localstorage.  
   * 
   * This is used in the pouchdb 'change' listener to ensure that when changes are made to 
   * event start times that the notification trigger times and text are updated to reflect this.
   * 
   * @event     Ember data record     The event to update associated notifications for.    
   */
  refreshPreference(event) {
    // If event is not null and the event isPreferred 
      // Unschedule and reschedule the event reminder
    if (event !== null && event.get('isPreferred')) {
      this.unscheduleEventReminder(event).then(() => {
        this.scheduleEventReminder(event);
      });
    }
  },

  /* 
   * togglePreference()
   *
   * If a preference doesn't exist supplied modelName and ID create a record in localstorage
   * amd trigger the method to create the local notifications.  
   * 
   * @modelName       string        The model type to toggle the preference for
   * @modelID         int           The id of the model to toggle the preference for
   */
  async togglePreference(modelName, modelID) {
    var self = this;

    // Get the model from the Ember Data store.  
    var model = self.get('store').peekRecord(modelName, modelID);

    // If the model is already a preference
      // The user action is to remove the preference.  Delete the record
      // and, if the model is an event unschedule the associated local notification.  
    // else
      // The user action is to add the preference.  Create a record in localstorage
      // and, if the model is an event schedule the associated local notification.  
    if (model.get('isPreferred')) {
      var existingPreference = null;

      // Get existing preferences
      var preferences = await self.get('store').findAll('preference');

      // Filter to find the record for this model.  
      existingPreference = preferences.filter(function (preference) {
        return (
          parseInt(preference.get(`${modelName}_id`)) ===
          parseInt(modelID)
        );
      });

      // Delete it.  
      existingPreference[0].deleteRecord('preference');
      existingPreference[0].save().then(() => {
        // Notify that the property is changed and unschedule the reminder. 
        model.notifyPropertyChange('isPreferred');
        if (modelName === 'event') {
          self.unscheduleEventReminder(model);
        }
      });
    } else {
      // Create the preference data object. 
      var preferenceData = {
        isPreferred: true,
      };
      preferenceData[modelName] = model;
      preferenceData[`${modelName}_id`] = model.get('id');

      // Create the record.  
      var newPreference = self
        .get('store')
        .createRecord('preference', preferenceData);

      newPreference.save().then(() => {
        // Record the activity for stats.  
        self.recordPreferenceActivity(model);

        // Trigger the heart beating animation
        self.set('beat', true);
        // Reset the heart beating animation
        later(() => {
          self.set('beat', false);
        }, 2000);

        model.notifyPropertyChange('isPreferred');

        // If the model is an event
          // Schedule a local notification.  
        if (modelName === 'event') {
          self.scheduleEventReminder(model, newPreference);
        }
      }).catch((e) => {
        console.log('error', e);
      });
    }
  },
  /* 
   * reminderTime()
   *
   * Get the time the local notification should be scheduled for.  
   * 
   * @event         Ember Data Model    The event model 
   * @fakeTime      Boolean             For testing, if set to true notifications are created 2 minutes after the current time
   */
  reminderTime(event, fakeTime) {
    var reminderTime;
    const eventTime = new moment(event.get('start_time'));

    // If fakeTime is true
      // Set reminder time to be two minutes after the current time
    // else
      // if the event is a community event
        // Set the reminder time to be done day before the start_time of the event.  
      // else
        // Set the reminder time to be 15 minutes before the start_time of the event
    if (fakeTime === true) {
      var fakeEventTime = new moment();
      reminderTime = fakeEventTime.add(2, 'm');
    } else {
      if (event.is_community_event === true) {
        reminderTime = eventTime.subtract(1, 'd');
      } else {
        reminderTime = eventTime.subtract(15, 'm');
      }
    }

    return reminderTime;
  },

  /* 
   * notificationData()
   *
   * Construct the data object for the local notification
   * 
   * @event         Ember Data Model    The event model
   * @reminderId    ReminderID          The id of this reminder.  
   */
  notificationData(event, reminderID) {
    var data;
    if (event.is_community_event === true) {
      data = {
        notification_type: 'community_event',
        model_id: event.get('id'),
        event_id: event.get('id'),
        event_type: 'community_event',
        notification_id: reminderID,
      };
    } else {
      data = {
        notification_type: 'event',
        model_id: event.get('id'),
        festival_id: event.get('festival_id'),
        event_id: event.get('id'),
        notification_id: reminderID,
      };
    }

    return data;
  },

  /* 
   * scheduleEventReminder()
   *
   * Schedule a local notification related to this event.  
   * 
   * @event     Ember Data Model    The event model
   */
  scheduleEventReminder(event) {
    // For testing, set this to true to receive local notifications 
    // 2 minutes after the current time.
    const fakeTime = false;

    this.settings
      .getSetting('local-notifications')
      .then((localNotificationSetting) => {
        // If the user has opted in to Local Notifications
          // Create a Local Notification for this event and a record in localstorage
          // to be displayed on in the notifications list in the app.  
        if (localNotificationSetting === true) {
          // Construct required variables in the correct format
          const reminderID = event.get('id');
          const eventName = event.get('name');
          const eventNameDecoded = $('<textarea />').html(eventName).text();
          const eventVenue = event.get('venue_name');
          const eventVenueDecoded = $('<textarea />').html(eventVenue).text();
          // Get the eventtime in the correct timezone.  
          const eventTime = new moment(event.get('start_time')).tz(
            'Europe/London',
          );
          const eventTimeFormatted = eventTime.format('h.mma');
          const reminderText =
            eventNameDecoded +
            ' starts at ' +
            eventTimeFormatted +
            ' at ' +
            eventVenueDecoded;
          var reminderTime = this.reminderTime(event, fakeTime);

          // Only create notification if the project is running the cordova environment.  
          if (
            window.cordova !== undefined &&
            window.cordova.plugins.notification.local !== undefined
          ) {
            // Construct the data object for local notifications.  
            var data = this.notificationData(event, reminderID);

            // If the reminderTime is in the future
              // Create a notification.  
            const timeNow = new moment();
            if (reminderTime > timeNow) {
              console.log(
                reminderID,
                reminderText,
                reminderTime,
                reminderTime.toDate(),
              );

              cordova.plugins.notification.local.schedule({
                id: reminderID,
                title: reminderText,
                text: reminderText,
                trigger: { at: reminderTime.toDate() },
                data: data,
                icon: 'res://drawable-nodpi/ic_cdv_splashscreen.png', 
                smallIcon: 'res://drawable-nodpi/ic_cdv_splashscreen.png'
              });
            }
          }

          // Create a notification to be shown in the notification list
          // in the app once the local notification has been delivered.  
          let notificationData = {
            notification_id: reminderID,
            festival_id: event.festival_id,
            subject: reminderText,
            sent_at: reminderTime.toDate(),
            motifiable_name: event.name,
            notification_type: 'local',
          };
          this.notificationsService.createOrUpdateNotification(
            notificationData,
            event,
          );
        }
      });
  },

  /* 
   * unscheduleEventReminder()
   *
   * Unschedule a local notification for this event.  
   * 
   * @event     Ember Data Object     The event model
   */
  unscheduleEventReminder(event) {
    var self = this;
    var reminderID = event.get('id');
    return new Promise(function (resolve) {
      // Delete the associated notification stored in local storage.  
      self.notificationsService.deleteNotification(reminderID);
      // If this is a cordova project
        // cancel the scheduled notification.  
      if (
        window.cordova !== undefined &&
        window.cordova.plugins.notification.local !== undefined
      ) {
        cordova.plugins.notification.local.cancel(reminderID, function () {
          resolve();
          console.log('reminder ' + reminderID + ' canceled');
        });
      } else {
        resolve();
      }
    });
  },
  
  /* 
   * recordPreferenceActivity()
   *
   * Record an 'Activity' for the action of adding an event or article to preferences.  
   * 
   * @model     Ember Data Object     The model to record the preference Activity for.  
   */
  async recordPreferenceActivity(model) {
    // Check that this use has data collection enabled.  
    var pseudonymousDataCollectionSetting = await this.settings.getSetting('pseudonymous-data-collection');
    if(pseudonymousDataCollectionSetting === true){
      // Glue code for legacy event data as subsequent logging broken
      // if event_type is null
      var tempModel = model;
      if (model.constructor.modelName === 'event') {
        if (tempModel.event_type === null) {
          tempModel.set('event_type', 'boma_event');
        }
      }

      this.activity.recordActivity(
        'love',
        model.constructor.modelName,
        tempModel,
      );
    }
  },

  /* 
   * getPreferences()
   * 
   * Get all preferences and return them sorted by model type
   */
  getPreferences() {
    var self = this;
    return new Promise(function (resolve) {
      return self.store.findAll('preference').then((ps) => {
        let preferences = {
          events: [],
          articles: [],
          venues: [],
        };

        ps.map((p) => {
          if (p.event_id) {
            preferences.events.push(parseInt(p.event_id));
          } else if (p.article_id) {
            preferences.articles.push(parseInt(p.article_id));
          } else if (p.venue_id) {
            preferences.venues.push(parseInt(p.venue_id));
          }
        });

        resolve(preferences);
      });
    });
  },
});
