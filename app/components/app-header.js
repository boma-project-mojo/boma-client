import $ from 'jquery';
import { schedule } from '@ember/runloop';
import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  headerService: service('header'),
  init: function () {
    schedule('afterRender', this, function () {
      $(document).on('mousewheel touchmove', '#header', function (e) {
        e.preventDefault();
      });
    });

    this._super();
  },
  actions: {
    /* 
     * toggleHeaderBottom()
     *
     * Action to toggle the Search bar.  
     */
    toggleHeaderBottom() {
      this.headerService.toggleHeaderBottom();
    },
  },
});
