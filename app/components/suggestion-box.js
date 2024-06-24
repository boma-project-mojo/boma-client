import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import $ from 'jquery';
import config from '../config/environment';

export default Component.extend({
  classNames: ['suggestion-box-wrap'],
  
  appVersion: config.APP.version,
  formService: service('form'),
  fireforSure: service('fire-for-sure'),
  location: service('location'),

  suggestion: '',
  suggestionSlackChannel: ENV['suggestionSlackChannel'],
  hasSent: false,
  allowIncludeLocation: true,
  unSentCount: alias('fireforSure.unSentCount'),

  suggestionUrl: ENV['suggestionUrl'],
  organisation_id: ENV['organisationId'],

  formPanes: ['send-suggestion', 'sent-suggestion'],

  currentPaneIndex: alias('formService.currentPaneIndex'),

  didRender() {
    this._super(...arguments);
    $('input, textarea').unbind();
    // Temporary solution to the iOS keyboard issue (viewport not updated after removing keyboard
    $('input, textarea').on('blur touchleave touchcancel', function () {
      window.scrollTo(0, 0);
    });
  },
  actions: {
    /*
     * registerFormElement
     *
     * Used to register each form pane with the form service.  This allows the form service to manage the navigation between form panes
     * and to set the active element in the breadcrumb.
     *
     * id     The id of the form Pane     String
     */
    registerFormElement(id) {
      this.formService.registerFormElement(id);
    },
    /*
     * sendUsMore
     *
     * Reset the form
     */
    sendUsMore: function () {
      this.set('hasSent', false);
      this.set('suggestion', '');
      this.set('includeLocation', false);
      this.set('includeAddress', false);
      this.formService.prev(this);
    },
    /*
     * submitSuggestion
     *
     * Format and submit the request
     */
    async submitSuggestion() {
      // Set default strings for additional details in message
      var senderAddressMessage = `<strong>Wallet Address:</strong> Not provided.`,
        locationString = `<strong>Location:</strong> Not provided`,
        deviceDetails = `<strong>Device Details:</strong> Not provided`,
        contactDetails = `<strong>Contact Details:</strong> Not provided`;

      // Initialise the request payload data object
      var requestPayload = {
        slack_channel: this.suggestionSlackChannel,  //for backwards compatibility 
        organisation_id: this.organisation_id,
      };

      // Enable loading spinner
      this.set('loading', true);

      // Crude validation so that the form can't be submitted empty
      if (this.suggestion === '') {
        this.set('errors', [
          "Your feedback can't be blank, please enter some text.",
        ]);
        this.set('loading', false);
        return;
      } else {
        requestPayload['suggestion'] = this.suggestion;
        this.set('errors', []);
      }

      // If this is from an phone get the device details
      if (window.cordova) {
        if (device) {
          deviceDetails = `\n\n 
<strong>Platform:</strong> ${device.platform}, 
<strong>Version:</strong> ${device.version}, 
<strong>Model:</strong> ${device.model}, 
<strong>Manufacturer:</strong> ${device.manufacturer}, 
<strong>App Version:</strong> ${this.appVersion}`;
        }
      }

      // If the user has opted to include their address include it.
      if (this.includeAddress == true) {
        senderAddressMessage = `<strong>Wallet Address:</strong> ${this.wallet.address}`;
        requestPayload['address'] = this.wallet.address;
      }

      // If the user has opted to include their current location then grab the location and update the locationString
      if (this.allowIncludeLocation && this.includeLocation) {
        try {
          let location = await this.location.getLocation();

          locationString = `<strong>Location:</strong> ${location.coords.latitude}, ${location.coords.longitude} <a href="https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}">View on Map</a> `;
        } catch (e) {
          console.log(`Suggestion Error:  Unable to get location ${e}`);
        }
      }

      // Get contact details
      if (this.contact) {
        contactDetails = `<strong>Contact Details:</strong> ${this.contact}`;
      }

      // Construct the message
      let message = `${
        this.suggestion
      }\n\n${deviceDetails}\n\n${locationString}\n${contactDetails}\n${senderAddressMessage}\n\n<strong>Sent at:</strong> ${moment().toString()}`;

      requestPayload['suggestion'] = message;

      await this.fireforSure.criticalPost(
        this.suggestionUrl,
        requestPayload,
        'suggestion',
      );

      // Progress the form
      this.formService.next(this);

      // Reset states
      this.set('loading', false);
      this.set('suggestion', null);
      this.set('contact', null);
    },
  },
});
