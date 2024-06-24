import Service, { inject as service } from '@ember/service';
import { Promise, all } from 'rsvp';

export default Service.extend({
  store: service('store'),
  logger: service(),

  /* 
   * getSetting()
   *
   * name       string      The name used to identify the setting.  
   * 
   * Get a setting by name.  
   */
  getSetting(name) {
    return this.store
      .query('setting', { filter: { name: name } })
      .then((settings) => {
        if (settings[0]) {
          return settings[0].value;
        } else {
          return null;
        }
      });
  },

  /* 
   * setSetting()
   *
   * name       string      The name used to identify the setting.  
   * value      boolean     The value to set the setting to
   * alertText  string      The text to display in the alert box after setting the setting. 
   * 
   * Set the setting of the given name to the value specified.  Optionally trigger an alert when complete. 
   */
  setSetting(name, value, alertText) {
    var self = this;
    return new Promise(function (resolve) {
      self.store.findAll('setting').then((settings) => {
        var existingSetting = settings.filter((setting) => {
          return setting.get('name') === name;
        });

        if (existingSetting.length > 0) {
          self.purgeExistingSetting(settings, name).then(() => {
            self.saveSetting(name, value).then(() => {
              resolve();
              if (alertText) {
                alert(alertText);
              }
            });
          });
        } else {
          self.saveSetting(name, value).then(() => {
            resolve();
            if (alertText) {
              alert(alertText);
            }
          });
        }
      });
    });
  },

  /* 
   * initialiseSetting()
   *
   * settingName       string      The name used to identify the setting.  
   * value              boolean     The value to set the setting to
   * 
   * Set the setting of the given name to the value specified.
   */
  initialiseSetting(settingName, value) {
    var self = this;
    return new Promise(function (resolve) {
      self.getSetting(settingName).then((setting) => {
        if (setting === undefined || setting === null) {
          self.setSetting(settingName, value).then(() => {
            resolve(true);
          });
        } else {
          // No need to initialise the settings, it's already got a value...
          resolve(true);
        }
      });
    });
  },

  /* 
   * initialiseSettings()
   * 
   * Initialise all settings to the default values, used on first load of app.  
   */
  initialiseSettings() {
    var promises = [];

    promises.push(this.initialiseSetting('critical-comms', true));
    promises.push(this.initialiseSetting('hq-comms', true));
    promises.push(this.initialiseSetting('article-news-notifications', true));
    promises.push(this.initialiseSetting('article-audio-notifications', true));
    promises.push(
      this.initialiseSetting('submission-published-notifications', true),
    );
    promises.push(
      this.initialiseSetting('submission-love-notifications', true),
    );
    promises.push(this.initialiseSetting('local-notifications', true));
    promises.push(
      this.initialiseSetting('new-community-events-notifications', true),
    );
    promises.push(
      this.initialiseSetting('new-peoples-gallery-notifications', true),
    );
    promises.push(this.initialiseSetting('pseudonymous-data-collection', true));

    return all(promises);
  },

  /* 
   * getAllSettingsAsJSON()
   * 
   * Returns all settings as a JSON to send to the server.  
   */ 
  getAllSettingsAsJSON() {
    return this.store.findAll('setting').then((settings) => {
      var settingsJSON = {};
      settings.forEach((setting) => {
        settingsJSON[setting.get('name')] = setting.get('value');
      });

      return settingsJSON;
    });
  },

  /* 
   * getAllSettingsAsJSON()
   * 
   * Remove an existing record from local storage.  
   */ 
  purgeExistingSetting(settings, name) {
    return new Promise(function (resolve) {
      settings.forEach((setting) => {
        if (setting.get('name') === name) {
          setting.deleteRecord();
          setting
            .save()
            .then(() => {
              resolve();
            })
            .catch((e) => {
              console.log(e);
            });
        }
      });
    });
  },

  /* 
   * saveSetting()
   *
   * name       string      The name used to identify the setting.  
   * value      boolean     The value to set the setting to
   * 
   * Save the setting using Ember data. 
   */
  saveSetting(name, value) {
    var setting = this.store.createRecord('setting', {
      name: name,
      value: value,
    });

    return setting.save();
  },

  /* 
   * hasExistingSettings()
   * 
   * Returns true if the app has existing settings.  
   */
  hasExistingSettings() {
    var self = this;

    return new Promise(function (resolve) {
      // Migrate any legacy settings if relevant...
      self.migrateLegacySettingsToNewLocalStorageAdapter().finally(() => {
        self.getAllSettingsAsJSON().then((allSettings) => {
          resolve(Object.keys(allSettings).length > 0);
        });
      });
    });
  },

  /* 
    migrateLegacySettingsToNewLocalStorageAdapter()

    In autumn 2023  https://github.com/locks/ember-localstorage-adapter was removed in favour of
    https://github.com/funkensturm/ember-local-storage as 'ember-localstorage-adapter' was no longer 
    maintained and not compatible with the latest LTS versions of ember-cli.  

    This function migrates the legacy settings data to the new local storage adapter format.  
  */
  migrateLegacySettingsToNewLocalStorageAdapter() {
    var self = this;

    return new Promise(function (resolve) {
      // There is only need to migrate settings once, if settings have been successfully migrated the following
      // localstorage record should have been set.  If it has then skip further migration.
      if (
        localStorage.getItem('legacySettingsSuccessfullyMigrated') === 'true'
      ) {
        resolve();
        return;
      }

      self.logger.log(`migrating legacy setting`, 'DEBUG');

      let legacyLSRecord = localStorage.getItem('DS.LSAdapter');
      let parsedLegacyLSRecord = JSON.parse(legacyLSRecord);

      if (legacyLSRecord && parsedLegacyLSRecord.setting) {
        let legacyActivity = parsedLegacyLSRecord.setting.records;
        // convert object of records into array.
        let legacyActivityAsArray = Object.values(legacyActivity);
        // Create an activity object using the new localstorage adapter.
        var promises = [];
        legacyActivityAsArray.forEach((setting) => {
          promises.push(self.initialiseSetting(setting.name, setting.value));
        });
        // Wait for all settings to be migrated and then finalise.
        all(promises)
          .then(() => {
            localStorage.setItem('legacySettingsSuccessfullyMigrated', true);
            resolve();
          })
          .catch((e) => {
            self.logger.log(e, 'ERROR');
          });
      } else {
        // If there are no legacy settings then skip this step.
        localStorage.setItem('legacySettingsSuccessfullyMigrated', true);
        resolve();
      }
    });
  },
});
