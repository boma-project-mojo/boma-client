/*

  This service handles the showing and hiding of flash messages in the app.  

  Flash messages are shown overlaid over the content for a configurable amount of time then fade out.  

*/

import Service from '@ember/service';
import { later, cancel } from '@ember/runloop';

export default Service.extend({
  flashShown: false,
  flashMessage: null,

  /* 
   * showFlash()
   *
   * Show a flash message with the message and CSS provided for a configurable amount of time. 
   * 
   * @message         str     The message that should be displayed
   * @flashClass      str     Any CSS class that should be on this flash message
   * @timeout         str     The amount of time in milliseconds that the flash should be shown
   */
  showFlash(message, flashClass = null, timeout = 1000) {
    var self = this;
    this.set('flashShown', true);
    this.set('flashMessage', message);
    this.set('flashClass', flashClass);
    let hidingTimeout = later(function () {
      self.hideFlash(timeout);
    }, timeout);
    this.set('hidingTimeout', hidingTimeout);
  },
  /* 
   * hideFlash()
   *
   * Hide the flash message
   */
  hideFlash() {
    var self = this;
    this.set('flashLeaving', true);
    later(function () {
      self.set('flashShown', false);
      self.set('flashMessage', null);
      self.set('flashLeaving', false);
      self.set('flashClass', null);
    }, 1000);
  },
  
  /* 
   * hideFlashWithoutTransition()
   *
   * Immediately hide the flash message
   */
  hideFlashWithoutTransition() {
    cancel(this.hidingTimeout);

    this.set('flashLeaving', true);
    this.set('flashShown', false);
    this.set('flashMessage', null);
    this.set('flashLeaving', false);
    this.set('flashClass', null);
  },
});
