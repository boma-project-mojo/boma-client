/* 

Animate Modal

This mixin provides actions which animate the closing the of modals

*/

import Mixin from '@ember/object/mixin';
import { later } from '@ember/runloop';

export default Mixin.create({
  actions: {
    /* 
     * doCloseModal()
     *
     * Optionally animate modal while closing 
     */
    doCloseModal() {
      // If the transition is not from modal to modal show a short animation whilst closing the modal.
      if (this.goBack != 'true') {
        // First add the class to trigger the animation
        $('#full-page-modal').addClass('out');
        // Wait for the length of the animation then send the close modal action.
        later(() => {
          this.closeModal();
        }, 150);
      } else {
        //otherwise don't..
        this.closeModal();
      }
    },
  },
});
