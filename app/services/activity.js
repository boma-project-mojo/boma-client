/* 
  This service handles all elements of reporting the users activity within the app.  

  Activity is stored in localstorage with one localstorage item stored per festival.  

  It contains functions that 
  - create the Activity records in localstorage
  - increment the totals stored when an action is completed
  - report the Activity to the server
 */

import Service, { inject as service } from '@ember/service';
import ENV from 'boma/config/environment';
import config from '../config/environment';
import { alias } from '@ember/object/computed';
import { later } from '@ember/runloop';
import { all } from 'rsvp';

export default Service.extend({
  store: service('store'),
  pouchDb: service('pouch-db'),
  settings: service('settings'),
  logger: service(),

  activityAPIEndpoint: ENV['activityAPIEndpoint'],

  festivalId: alias('pouchDb.currentFestivalID'),
  organisationId: ENV['organisationId'],

  appVersion: config.APP.version,

  /*
		Initialise the Activity object 
		(for convenience, as this happens on app load, record ping)
  */
  async initActivity() {
    try {
      // Migrate legacy activity to new local storage adapter format
      await this.migrateLegacyActivityToNewLocalStorageAdapter();
      this.activityJSON = await this.getActivity();
      // App Opening Pings
      await this.recordActivity('ping', 'total_all');
    } catch (e) {
      this.logger.log(e, 'ERROR');
    }
  },

  /*
		Get existing localstorage record of Activity or
		intialise a new one
  */
  getActivity() {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (
        self.get('festivalId') === null ||
        self.get('festivalId') === undefined
      ) {
        reject();
        return false;
      }

      self.store.findAll('activity').then((activity) => {
        let festivalActivity = activity.filter((a) => {
          if (a.festival_id === self.get('festivalId')) return a;
        });
        if (festivalActivity.length > 0) {
          // If there's a activity object return it
          resolve(festivalActivity[0]);
        } else {
          // If there's no current activity object create it
          self
            .createActivity(self.get('festivalId'))
            .then((activity) => resolve(activity))
            .catch((e) => {
              self.logger.log(e, 'ERROR');
            });
        }
      });
    });
  },

  /*
		Create a new Activity Record

		@festivalId     			  The festivalId
    @activities (optional)  The activities object (useful when used to recreate existing records)         
  */
  createActivity(festivalId, activities = {}) {
    let activity = this.store.createRecord('activity', {
      activities: activities,
      festival_id: festivalId,
    });
    return activity.save();
  },

  /*
		Record activity, incrementing all necessary tallies in localstorage

		@activityAction  			The action that has been completed (ping, view, love etc) 
		@activityCategory  		The category of activity that has been completed 
		@model (optional)			The model object of the related record 
  */
  async recordActivity(activityAction, activityCategory, model = false) {
    if (this.activityJSON === null || this.activityJSON === undefined) {
      await this.initActivity();
    }

    var self = this;
    return new Promise(function (resolve) {
      self.settings
        .getSetting('pseudonymous-data-collection')
        .then((pseudonymousDataCollectionSetting) => {
          if (pseudonymousDataCollectionSetting === true) {
            if (model === false) {
              // All
              self.incrementActivity(activityAction, activityCategory);
            }

            // Type
            if (model !== false) {
              if (model.constructor.modelName === 'article') {
                self.incrementActivity(activityAction, 'total', model);
                self.incrementActivity(
                  activityAction,
                  'article_type',
                  model,
                  model.article_type,
                );
              } else if (model.constructor.modelName === 'event') {
                self.incrementActivity(activityAction, 'total', model);
                self.incrementActivity(
                  activityAction,
                  'event_type',
                  model,
                  model.event_type,
                );
              } else if (model.constructor.modelName === 'production') {
                self.incrementActivity(activityAction, 'total', model);
              }

              // Tags
              self.incrementTagActivity(activityAction, model);
            }

            self.saveActivity();
            resolve();
          } else {
            // pseudonymousDataCollectionSetting DISABLED, skipping
            resolve();
          }
        });
    });
  },

  /*
		Increment localstorage tally for appropriate activity.  

		activityAction			The action that has been completed (ping, view, love etc) 
		activityCategory: 	The category of activity that has been completed, assumes the role of activityName
												where activityName is null
		activityName: 			the name of this Activity
												e.g 'community_event' for a heart/view tally
		model: 							the store record of the model this activity relates to
	*/
  incrementActivity(
    activityAction,
    activityCategory,
    model = false,
    activityName = null,
  ) {
    // Find or initialise the localstorage reference to the current activityAction.
    this.activityJSON.activities[activityAction] =
      this.activityJSON.activities[activityAction] || {};

    if (model !== false) {
      // Where the Activity relates to a model
      // Find or initialise the localstorage reference to the current model
      this.activityJSON.activities[activityAction][
        model.constructor.modelName
      ] =
        this.activityJSON.activities[activityAction][
          model.constructor.modelName
        ] || {};

      if (activityName) {
        // Where the Activity has an activityName
        // Find or initialise the localstorage reference to the current models activityCategory
        this.activityJSON.activities[activityAction][
          model.constructor.modelName
        ][activityCategory] =
          this.activityJSON.activities[activityAction][
            model.constructor.modelName
          ][activityCategory] || {};

        // Either increment the activityName tally or initialise with a value of 1
        this.activityJSON.activities[activityAction][
          model.constructor.modelName
        ][activityCategory][activityName] =
          this.activityJSON.activities[activityAction][
            model.constructor.modelName
          ][activityCategory][activityName] + 1 || 1;
      } else {
        // Where no activityName is provided
        // Either increment the activityCategory tally or initialise with a value of 1
        this.activityJSON.activities[activityAction][
          model.constructor.modelName
        ][activityCategory] =
          this.activityJSON.activities[activityAction][
            model.constructor.modelName
          ][activityCategory] + 1 || 1;
      }
    } else {
      // Where no model is provided
      if (activityName) {
        // Where the Activity has an activityName
        // Find or initialise the localstorage reference to the current activityType
        this.activityJSON.activities[activityAction][activityCategory] =
          this.activityJSON.activities[activityCategory] || {};
        // Either increment the activityName tally or initialise with a value of 1
        this.activityJSON.activities[activityAction][activityCategory][
          activityName
        ] =
          this.activityJSON.activities[activityAction][activityCategory][
            activityName
          ] + 1 || 1;
      } else {
        // Where no activityName is provided
        // Either increment the activityType tally or initialise with a value of 1
        this.activityJSON.activities[activityAction][activityCategory] =
          this.activityJSON.activities[activityAction][activityCategory] + 1 ||
          1;
      }
    }
  },

  /*
		Increment localstorage tally for tags for the appropriate activity.  

		activityAction			The action that has been completed (ping, view, love etc) 
	*/
  incrementTagActivity(activityAction, model) {
    // Find or initialise the localstorage reference to the current model tags
    this.activityJSON.activities[activityAction][model.constructor.modelName][
      'tags'
    ] =
      this.activityJSON.activities[activityAction][model.constructor.modelName][
        'tags'
      ] || {};

    if (model.tags) {
      model.tags.forEach((t) => {
        // Either increment the tag tally or initialise with a value of 1 for each of the related model's tags
        this.activityJSON.activities[activityAction][
          model.constructor.modelName
        ]['tags'][t] =
          this.activityJSON.activities[activityAction][
            model.constructor.modelName
          ]['tags'][t] + 1 || 1;
      });
    }
  },

  /*
		Save the localstorage record
	*/
  saveActivity() {
    this.activityJSON.save();
  },

  /*
		Update the remote server Activity record for this walletAddress

		@walletAddress			The address of the localstorage wallet 
	*/
  async performReportActivity(walletAddress) {
    var self = this;

    // Check that pseudonymousDataCollectionSetting is enabled
    let pseudonymousDataCollectionSetting = await self.settings.getSetting(
      'pseudonymous-data-collection',
    );

    // If pseudonymousDataCollectionSetting is enabled
    if (pseudonymousDataCollectionSetting === true) {
      // Get all stored activity data
      let activities = await self.store.findAll('activity');

      // Init the payload for the request to update the remote server
      var payload = {
        address: walletAddress,
        app_version: self.get('appVersion'),
        activity_type: 'app_usage',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        organisation_id: self.get('organisationId'),
        activities: []
      }

      // Loop through each activity and  
      for (var activity of activities.slice()) {
        var festival = await self.store.findRecord(
          'festival',
          activity.festival_id,
        );

        // Only send stats is analysis_enabled is true for this festival
        if (festival.analysis_enabled === true) {
          let data = {
            reported_data: JSON.stringify(activity.activities),
            festival_id: activity.festival_id,
          };

          payload.activities.push(data);
        }
      }

      // Only send the request if there's actually data to report.  
      if(payload.activities.length > 0){
        // Send POST request to report activity
        $.ajax(self.activityAPIEndpoint + 'report_activity_for_all_festivals', {
          method: 'POST',
          data: payload,
        })
          .then((response) => {
            console.log(
              `Reported Activity for Festival_id ${payload.activities.map((a)=>{return a.festival_id})}`,
              response,
            );
          })
          .catch((err) => {
            console.log('Err: performReportActivity', err);
          });
      }

    }
  },

  /*
		Set an interval the periodically Update the remote server Activity record for this walletAddress

		@walletAddress			The address of the localstorage wallet 
	*/
  reportActivity(walletAddress) {
    var self = this;
    self.performReportActivity(walletAddress);
    later(function () {
      self.reportActivity(walletAddress);
    }, 300000);
  },

  /* 
    migrateLegacyActivityToNewLocalStorageAdapter()

    In autumn 2023  https://github.com/locks/ember-localstorage-adapter was removed in favour of
    https://github.com/funkensturm/ember-local-storage as 'ember-localstorage-adapter' was no longer 
    maintained and not compatible with the latest LTS versions of ember-cli.  

    This function migrates the legacy activity data to the new local storage adapter format.  
  */
  migrateLegacyActivityToNewLocalStorageAdapter() {
    var self = this;
    return new Promise(function (resolve) {
      // There is only need to migrate a wallet once, if a wallet is successfully migrated the following
      // localstorage record should have been set.  If it has then skip further migration.
      if (
        localStorage.getItem('legacyActivitySuccessfullyMigrated') === 'true'
      ) {
        resolve();
        return;
      }

      self.logger.log(`migrating legacy activity`, 'DEBUG');

      let legacyLSRecord = localStorage.getItem('DS.LSAdapter');
      let parsedLegacyLSRecord = JSON.parse(legacyLSRecord);

      if (legacyLSRecord && parsedLegacyLSRecord.activity) {
        let legacyActivity = parsedLegacyLSRecord.activity.records;
        // convert object of records into array.
        let legacyActivityAsArray = Object.values(legacyActivity);
        // Create an activity object using the new localstorage adapter.
        var promises = [];
        legacyActivityAsArray.forEach((activity) => {
          promises.push(
            self.createActivity(activity.festival_id, activity.activities),
          );
        });

        // Wait for all activity to be migrated and then finalise.
        all(promises)
          .then(() => {
            localStorage.setItem('legacyActivitySuccessfullyMigrated', true);
            resolve();
          })
          .catch((e) => {
            self.logger.log(e, 'ERROR');
          });
      } else {
        // If there are no legacy activities to migrate then skip this step.
        localStorage.setItem('legacyActivitySuccessfullyMigrated', true);
        resolve();
      }
    });
  },
});
