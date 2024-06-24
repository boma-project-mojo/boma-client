import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';
import GoToRouteMixin from '../mixins/go-to-route';
import config from 'boma/config/environment';

export default Controller.extend(GoToRouteMixin, {
  applicationController: controller('application'),

  fireforSure: service('fire-for-sure'),
  unSentCount: alias('fireforSure.unSentCount'),
  retryingNow: alias('fireforSure.retryingNow'),
  loadingSucceeded: alias('fireforSure.loadingSucceeded'),
  loadingFailed: alias('fireforSure.loadingFailed'),
  secondsUntilNextAttempt: alias('fireforSure.secondsUntilNextAttempt'),
  showRefreshButton: alias('fireforSure.showRefreshButton'),

  festivalhomeRouteName: config.festivalHome.routeName,
  festivalHomeParams: config.festivalHome.params,

  secondsTillBackoffRetry: 0,
  actions: {
    /* 
     * retryNow()
     *
     * Retry sending the suggestion.  
     */
    retryNow() {
      this.fireforSure.retryNow();
    },
  },
});
