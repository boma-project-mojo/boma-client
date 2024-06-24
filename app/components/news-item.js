import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  /* 
   * isShowcaseNotification
   *
   * When a notification is clicked in the phone notification tray
   * the ID is passed to the notifications route when the data payload 
   * is handled.  The related notification is 'highlighted' in the CSS.  
   */
  isShowcaseNotification: computed(
    'notification_id',
    'showcase_notification',
    function () {
      if (
        parseInt(this.notification_id) === parseInt(this.showcase_notification)
      ) {
        return true;
      } else {
        return false;
      }
    },
  ),
  didInsertElement() {
    this._super(...arguments);
    // if this notification should be highlighted 
      // scroll the list to the top of this item
    if (this.isShowcaseNotification) {
      if ($(`#${this.elementId}`).offset().top > window.innerHeight) {
        $('#main').scrollTop($(`#${this.elementId}`).offset().top);
      }
    }
  },
});
