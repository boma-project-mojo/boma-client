import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  retryingNow: false,
  /* 
   * humanReadableRetryIn
   *
   * Create a human readable time to show when the request
   * will next automatically retry.  
   */
  humanReadableRetryIn: computed('secondsUntilNextAttempt', function () {
    var retryin,
      backoff = this.secondsUntilNextAttempt;

    switch (true) {
      // seconds
      case backoff < 60:
        retryin = `${backoff} seconds`;
        break;
      // minutes
      case backoff > 60 && backoff < 3600:
        retryin = `${Math.floor(backoff / 60)} minutes`;
        break;
      // hours
      case backoff > 3600:
        retryin = `${Math.floor(backoff / 60 / 60)} hours`;
        break;
    }

    return retryin;
  }),
});
