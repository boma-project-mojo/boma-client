import Component from '@ember/component';
import { set } from '@ember/object';
import layout from '../templates/components/search-select';

export default Component.extend({
  layout,
  tagName: '',

  actions: {
    close(e, sb) {
      sb.close();
    },

    searched(results, query, sb) {
      set(this, 'lastQuery', query);
      sb.open();
    },
  },

  didRender() {
    this._super(...arguments);
    $('input, textarea').unbind();
    // Temporary solution to the iOS keyboard issue (viewport not updated after removing keyboard
    $('input, textarea').on('blur touchleave touchcancel', function () {
      window.scrollTo(0, 0);
    });
  },
});
