import Component from '@ember/component';
import ENV from 'boma/config/environment';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { A } from '@ember/array';

export default Component.extend({
  apiEndpoint: ENV['apiEndpoint'],

  tokenService: service('token'),
  fireforSure: service('fire-for-sure'),
  retryingNow: alias('fireforSure.retryingNow'),
  loadingSucceeded: alias('fireforSure.loadingSucceeded'),
  loadingFailed: alias('fireforSure.loadingFailed'),
  secondsUntilNextAttempt: alias('fireforSure.secondsUntilNextAttempt'),

  /* 
   * momentFromNow
   * 
   * Calculate the time until the next attempt to send the request to
   * submit this survey.
   */
  momentFromNow: computed('secondsUntilNextAttempt', function () {
    return new moment().add(this.secondsUntilNextAttempt, 'seconds').fromNow();
  }),

  responses: null,

  baseErrors: [],

  /* 
   * surveyState
   *
   * Surveys have an opening and closing time.  
   * Check whether the survey is waiting to open, open or closed.  
   */
  surveyState: computed(
    'pendingRequest',
    'survey.{disable_at,enable_at}',
    function () {
      var surveyState;

      // If there is a pending request 
        // then the survey should be shown as open so the UI shows the request is still pending.  
      // else
        // if the current time is before the enable_at time
          // The state is 'waiting'
        // else if the current time is after the disable_at time 
          // The state is 'closed'
        // else if the current time is after the enable_at and before the disable_at time
          // The state is 'open'
      if (this.pendingRequest) {
        surveyState = 'open';
      } else {
        if (moment().isBefore(this.survey.enable_at)) {
          surveyState = 'waiting';
        } else if (moment().isAfter(this.survey.disable_at)) {
          surveyState = 'closed';
        } else if (
          moment().isAfter(this.survey.enable_at) &&
          moment().isBefore(this.survey.disable_at)
        ) {
          surveyState = 'open';
        }
      }

      return surveyState;
    },
  ),

  /* 
   * requestStatus
   * 
   * Return the status of the request to respond to the survey.  
   */
  requestStatus: computed('pendingRequest.requestStatus', function () {
    // If there is a pending request
      // if 200
        // status is 'success'
      // else if 422 or 500
        // status is 'fail'
      // else if status is not set 
        // status is 'registering' (this is the state whilst requests are taking place)
    if (this.pendingRequest) {
      if (this.pendingRequest.requestStatus === 200) {
        return 'success';
      } else if (
        this.pendingRequest.requestStatus === 422 ||
        this.pendingRequest.requestStatus === 500
      ) {
        return 'fail';
      } else {
        return 'registering';
      }
    } else {
      return 'init';
    }
  }),

  /* 
   * showForm
   *
   * The survey questions and answers form is shown if the requestStatus is 'init' or 'fail'
   */
  showForm: computed('requestStatus', function () {
    return this.requestStatus === 'init' || this.requestStatus === 'fail';
  }),

  async init() {
    this._super(...arguments);
    // Get the wallet here because getting it in the route causes undesired rerendering of the list item components spoiling transition animations.
    var wallet = await this.tokenService.getWallet();
    // Set the address and survey id in the request Payload
    let responses = {};
    responses.address = wallet.address;
    responses.survey_id = this.survey.id;
    responses.questions = A([]);
    this.set('responses', responses);

    // Get any existing pending or completed requests.
    this.fireforSure
      .getRequests('survey', this.survey.id, true, true)
      .then((pendingRequests) => {
        this.set('pendingRequest', pendingRequests[pendingRequests.length - 1]);
        if (pendingRequests.length > 0) {
          this.responses.questions = A(
            pendingRequests[pendingRequests.length - 1].postData.questions,
          );
        }
      });
  },

  /* 
   * doSubmitSurvey()
   * 
   * Make the request to submit the survey using the 'fireForSure' system.  
   */
  doSubmitSurvey() {
    // If all the questions haven't got a response
      // return an error.
    if (this.responses.questions.length !== this.survey.questions.length) {
      this.set('baseErrors', ['Please answer all the questions.']);
      return false;
    }

    var self = this;
    // Make the request
    return this.fireforSure
      .criticalPost(
        `${this.apiEndpoint}/respond_to_survey`,
        this.responses,
        'survey',
        this.responses.survey_id,
      )
      .then((ffs) => {
        self.set('loading', false);
        self.set('pendingRequest', ffs);
      });
  },
  actions: {
    /*
     * updateSelectedRadio()
     * 
     * Update the response to the question provided
     * 
     * questionId     int     The id of the question
     * answerId       int     The id of the answer
     */
    updateSelectedRadio(questionId, answerId) {
      let responses = this.responses;
      let questionResponses = responses.questions;

      let existingQuestionResponse = questionResponses.find(
        (element) => element.id === questionId,
      );

      if (existingQuestionResponse) {
        let questionResponseIndex = questionResponses.findIndex(
          (element) => element.id == questionId,
        );

        questionResponses[questionResponseIndex] = {
          id: questionId,
          answer_id: answerId,
        };
      } else {
        questionResponses.push({
          id: questionId,
          answer_id: answerId,
        });
      }

      responses.questions = questionResponses;

      this.set('responses', responses);
    },
    /*
     * submit()
     * 
     * Submit the response
     */
    submit() {
      this.doSubmitSurvey();
    },
    /*
     * retryNow()
     * 
     * Retry sending the request immediately.
     */
    retryNow() {
      this.fireforSure.retryNow();
    },
  },
});
