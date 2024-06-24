import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default Component.extend({
  form: service(),
  classNames: ['form-pane'],
  init() {
    this._super(...arguments);
    this.registerFormElement(this.id);
  },
  didRender() {
    this._super(...arguments);
    var self = this;
    $('input, textarea').unbind();
    // Temporary solution to the iOS keyboard issue (viewport not updated after removing keyboard
    $('input, textarea').on('blur touchleave touchcancel', function () {
      window.scrollTo(0, 0);
      // If the slide is changed when the android keyboard is open then part of the next slide is missing
      // this resizes the pane.  Timeout required otherwise it doesn't work.
      later(() => {
        self.form.flkty.resize();
      }, 500);
    });

    // Prevent tab from navigating through form elements
    $('input').on('keydown mouseup', function (e) {
      if (e.keyCode === 9) {
        e.preventDefault();
      }
    });
  },
});
