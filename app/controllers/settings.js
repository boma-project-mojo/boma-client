import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import ENV from 'boma/config/environment';

export default Controller.extend({
  pouchDb: service('pouch-db'),
  settings: service('settings'),
  notificationsService: service('notifications'),

  subtleWallet: ENV['subtleWallet'],
  enableLessWordyCopy: ENV['enableLessWordyCopy'],
  privacyPolicyURL: ENV['privacyPolicyURL'],

  /* 
   * refresh()
   *
   * Trigger the route action to reload the route model.
   */
  refresh() {
    this.send('refreshModel');
  },
  actions: {
    /* 
     * setLocalNotifications()
     *
     * Set the setting for local notifications and if relevant handle cancelling all
     * existing notifications.
     * 
     * name        str        the name of the setting to set
     * value       bool       the value to set the setting to
     */
    setLocalNotifications(name, value) {
      var self = this;
      // If cordova
        // If enabling local notifications
          // set the setting
        // else (turning off local notifications)
          // cancel all existing local notifications and set the setting
      // else
        // set the setting
      if (window.cordova) {
        if (!value === true) {
          self.send('setBooleanSetting', name, value);
        } else {
          window.cordova.plugins.notification.local.getAll(function () {
            window.cordova.plugins.notification.local.cancelAll(function () {
              self.send('setBooleanSetting', name, value);
            });
          });
        }
      } else {
        this.send('setBooleanSetting', name, value);
      }
    },
    /* 
     * setBooleanSetting()
     *
     * Set the given setting name to the appropriate setting.  
     * Trigger an optional javascript alert.  
     * 
     * name        str        the name of the setting to set
     * value       bool       the value to set the setting to
     * alert       str        text to be displayed in a js alert upon setting the setting
     */
    setBooleanSetting(name, value, alert) {
      // Set setting
      this.settings.setSetting(name, !value, alert).then(() => {
        // Refresh the route model
        this.refresh();
        // Update the server copy of the settings for this address.  
        this.notificationsService.updateRemoteAddressRecord(
          this.model.wallet.address,
        );
      });
    },
    /* 
     * resetData()
     *
     * Reset the data for this app to the default state. 
     */
    async resetData() {
      var confirm = window.confirm(
        'Are you sure?  This will reset all the event data.',
      );
      if (confirm == true) {
        await this.pouchDb.dumpData();
      }
    },
  },
});
