/*
 *
 * FIRE FOR SURE
 *
 * This mixin allows critical requests to be saved so that, in the case where a user has poor network
 * attempts to resend the post request can be made at a later date.
 *
 * Requests are attempted
 *   - when a user opens the app
 *   - when a user creates another critical post request
 *
 * Requests are sent on exponential backoff which resets when a user closes and reopens the app.
 *
 */

import Service, { inject as service } from '@ember/service';
import $ from 'jquery';
import { later, cancel } from '@ember/runloop';
import { getOwner } from '@ember/application';

export default Service.extend({
  router: service(),
  logger: service(),
  store: service('store'),
  tryAgain: null,
  secondsUntilNextAttempt: false,
  httpTimeout: 5000,
  retryingNow: false,
  totalAttempts: 0,
  showRefreshButton: false,

  /*
   * initialise
   *
   * return the states to initial values.
   */
  initialise() {
    this.set('secondsUntilNextAttempt', false);
    this.set('totalAttempts', 0);
    this.set('tryAgain', null);
    this.set('showRefreshButton', false);
  },

  /*
   * tryAndTryAgain()
   * relatedModelName    A model name of a related model.
   * relatedModelID      A id of a related model.
   *
   * Starts a long polling job to try pending requests with an exponential backoff
   * until they complete
   */
  async tryAndTryAgain(relatedModelName = null, relatedModelID = null) {
    var self = this;

    // Get all pending requests
    let pendingRequests = await this.getRequests(
      relatedModelName,
      relatedModelID,
    );

    // Check pending requests exist, if not return.
    if (pendingRequests.length === 0) return;

    this.logger.log(
      `%c Starting job to send critical post requests.`,
      'DEBUG',
      'background-color: darkBlue; color: white;',
    );

    // Do not proceed if this job is currently running in the background.
    if (this.retryingNow === true) return;

    // Start the job
    self.set('retryingNow', true);
    self.set('showRefreshButton', true);

    // Loop through each of the requests and try and send, collecting responses.
    var response = null;
    var responses = [];

    for (let pendingRequest of pendingRequests) {
      try {
        response = await self.sendPendingRequest(pendingRequest);
      } catch (e) {
        response = e;
      }
      responses.push(response);
    }

    // Calculate success and failure counts for logging
    let successCount = responses.filter(Boolean).length;
    let failureCount = responses.length - successCount;

    this.logger.log(
      `%c All critical post requests have been attempted (${successCount} Succeeded, ${failureCount} Failed).`,
      'DEBUG',
      'background-color: darkBlue; color: white;',
    );

    if (failureCount > 0) {
      // Setup job to retry at next interval
      self.setTick();
    } else {
      self.initialise();
    }

    // Inform the UI that retrying is complete
    // use a timeout because sometimes it is too quick
    setTimeout(() => {
      self.set('retryingNow', false);
      if (failureCount > 0) {
        // If there are errors show the error state
        self.set('loadingFailed', true);
      } else {
        // If it was successful show the success state
        self.set('loadingSucceeded', true);
      }
      // Reset states giving 1000ms to inform user
      setTimeout(() => {
        self.set('loadingSucceeded', false);
        self.set('loadingFailed', false);
      }, 1000);
    }, 2000);
  },

  /*
   * setTick
   * setup the timeout to try and complete the critical post requests later.
   */
  async setTick() {
    var self = this;

    // Increment the totalAttempts, used to calculate the backoff length
    self.set('totalAttempts', self.totalAttempts + 1);

    // set the timeout for later() to be the number of attempts that the tick has been reset
    // plus the next backoff interval (calculated using totalAttempts)
    let timeout = this.httpTimeout + 25000 * this.totalAttempts;

    // create the later() timeout
    let tryAgain = later(() => {
      self.tryAndTryAgain();
    }, timeout);
    self.set('tryAgain', tryAgain);

    // set secondsUntilNextAttempt, used in the UI for managing expectations around the next time the request
    // will be attempted.
    self.set('secondsUntilNextAttempt', timeout / 1000);

    this.logger.log(
      `%c Scheduled job to send critical posts in ${this.secondsUntilNextAttempt}s`,
      'DEBUG',
      'background-color: darkBlue; color: white;',
    );
  },

  /*
   * sendPendingRequest()
   * pendingRequest the fire-for-sure ember data object (object)
   *
   * Attempt the ajax post request using the url and postData stored in the ember
   * data object.  Handle success and failure.
   */
  async sendPendingRequest(pendingRequest) {
    let self = this;

    return new Promise((resolve, reject) => {
      return $.ajax(pendingRequest.get('url'), {
        method: 'POST',
        data: pendingRequest.get('postData'),
        timeout: self.httpTimeout,
      })
        .then((response) => {
          self.handleSuccessfulRequest(pendingRequest, response).then(() => {
            resolve(true);
          });
        })
        .catch((response) => {
          self.handleFailedRequest(pendingRequest, response).then(() => {
            reject(false);
          });
        });
    });
  },

  /*
   * criticalPost
   * url                The url to direct the post request to               (str)
   * postData           The data to be included in the post request         (object)
   * relatedModelName   A model name to use to identify the post request    (str)
   * relatedModelID     The id of the related model                         (int)
   *
   * Use in place of post requests to create a request that will be retried until it completes.
   */
  criticalPost(url, postData, relatedModelName, relatedModelID) {
    let ffs = this.store.createRecord('fire-for-sure', {
      url: url,
      postData: postData,
      relatedModelName: relatedModelName,
      relatedModelID: relatedModelID,
    });

    return ffs
      .save()
      .then((ffs) => {
        this.set('totalAttempts', 0);
        this.tryAndTryAgain();
        return ffs;
      })
      .catch((err) => {
        console.log(err);
      });
  },

  /*
   * handleSuccessfulRequest()
   * pendingRequest  the ember data object for the pendingRequest being handled  (object)
   * response        the ajax response    (object)
   *
   * handles a successful request setting sentAt on the pendingRequest fire-for-sure model and handling
   * sending the onSend actions
   */
  async handleSuccessfulRequest(pendingRequest, response) {
    pendingRequest.set('sentAt', new Date());
    pendingRequest.set('requestStatus', 200);
    await this.onSend(pendingRequest, response);
    return pendingRequest.save();
  },

  /*
   * handleFailedRequest()
   * pendingRequest  the ember data object for the pendingRequest being handled  (object)
   * response        the ajax response    (object)
   *
   * handles a failed request incrementing on the pendingRequest fire-for-sure model and handling
   * sending the onSend actions
   *
   * 422 responses are cancelled
   */
  async handleFailedRequest(pendingRequest, response) {
    pendingRequest.setProperties({
      attempts: pendingRequest.get('attempts') + 1,
      requestErrors: response.responseJSON,
      requestStatus: response.status,
    });

    if (response.status === 422) {
      await this.onTerminalError(pendingRequest, response);
    }

    return pendingRequest.save();
  },

  /*
   * onSend()
   * response   the response object from a successful ajax call

   * handle the response of a successful critical post request.  
   */

  onSend(pendingRequest, response) {
    if (pendingRequest.get('relatedModelName') === 'token') {
      // Handle the response of a successful request for token fire-for-sures
      return this.store
        .findRecord('token2', response.data.attributes.client_id)
        .then((token) => {
          token.set('server_id', response.data.id);
          token.set('aasm_state', response.data.attributes.aasm_state);
          token.set('last_updated_at', response.data.attributes.updated_at);
          token.save();
          return true;
        });
    } else if (pendingRequest.get('relatedModelName') === 'survey') {
      // Handle the response of a successful request for survey fire-for-sures
      var currentRoute = this.router.currentRouteName;
      // If the current route is the article route then reload the model.
      if (currentRoute === 'articles') {
        getOwner(this)
          .lookup('route:' + currentRoute)
          .send('reloadModel');
      }
    } else {
      // Handle the response of a successful request for all other fire-for-sures
      Promise.resolve();
    }
  },

  /*
   * onError()
   *
   * handle the response of a terminally failed critical post request.
   */
  onTerminalError(pendingRequest) {
    if (pendingRequest.get('relatedModelName') === 'survey') {
      // Handle the response of a successful request for survey fire-for-sures
      var currentRoute = this.router.currentRouteName;
      // If the current route is the article route then reload the model.
      if (currentRoute === 'articles') {
        getOwner(this)
          .lookup('route:' + currentRoute)
          .send('reloadModel');
      }
    }
  },

  /*
   * retryNow()
   *
   * Handles the user action to try sending critical post requests immediately.
   */
  retryNow() {
    // cancel the timeout scheduled for later.
    cancel(this.tryAgain);
    // set totalAttempts to 0 to ensure the job is tried immediately.
    this.set('totalAttempts', 0);
    // set trying at to now
    this.set('secondsUntilNextAttempt', null);
    // try to send the requests
    return this.tryAndTryAgain();
  },

  /*
   * getRequests()
   * relatedModelName   a name of a related model               (str)
   * relatedModelID     the id of a related model               (int)
   * includeFails       include failed requests                 (boolean)
   * includeSuccesses   include successful completed requests   (boolean)
   *
   * Get critical requests.
   *
   * If both relatedModelName and relatedModelID is provided, only return pending requests related to that model.
   *
   * If only relatedModelName is included return all fireForSure that are of that model type.
   */
  getRequests(
    relatedModelName = null,
    relatedModelID = null,
    includeFails = false,
    includeSuccesses = false,
  ) {
    return this.store.findAll('fire-for-sure').then(function (pendingRequests) {
      return pendingRequests.filter(function (pendingRequest) {
        if (
          (relatedModelID === null ||
            (relatedModelID &&
              pendingRequest.get('relatedModelID') === relatedModelID)) &&
          (relatedModelName === null ||
            (relatedModelName &&
              pendingRequest.get('relatedModelName') === relatedModelName)) &&
          (includeSuccesses === true ||
            (includeSuccesses === false &&
              pendingRequest.get('sentAt') === null)) &&
          (includeFails === true ||
            (includeFails === false &&
              pendingRequest.get('requestStatus') !== 422))
        ) {
          return true;
        }
      });
    });
  },
});
