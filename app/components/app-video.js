import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  flash: service(),
  error(err) {
    this.flash.showFlash(
      "Sorry, you seem to be offline, we can't show you this video now, try again later.",
      'video_error',
      10000,
    );
    console.log(err);
  },
  didInsertElement() {
    var self = this;
    this._super(...arguments);
    // Create an event listener to handle errors in the video player
    const playerElement = document.querySelector("#app-video")
    playerElement.addEventListener("error", (event) => {
      self.error(event.target.error);
    })
  },
  willDestroyElement() {
    this._super(...arguments);
    // Hide the falsh error used for displaying video player errors
    // when leaving the route.
    this.flash.hideFlashWithoutTransition();
  },
});
