import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  isChecked: computed('id', 'model.id', 'selected', function () {
    return parseInt(this.selected) === this.id;
  }),
});
