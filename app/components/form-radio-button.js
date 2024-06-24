import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  classNames: ['form-pane-radio-button'],
  isChecked: computed('selected', 'value', function () {
    return this.value === this.selected;
  }),
});
