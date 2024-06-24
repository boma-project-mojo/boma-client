import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  isChecked: computed(
    'model.id',
    'selected',
    'selectedPersistently',
    'value',
    function () {
      var checked;
      if (this.model) {
        // Check if this box should be checked because it's included in the selectedPersistently params
        if (this.selectedPersistently) {
          checked =
            this.selected.includes(this.model.id) ||
            this.selectedPersistently.includes(this.model.id);
        } else {
          checked = this.selected.includes(this.model.id);
        }
      }
      if (this.value) {
        checked = this.value;
      }
      return checked;
    },
  ),
  isDisabled: computed(
    'model.id',
    'selected',
    'selectedPersistently',
    function () {
      // Check if this box should be disabled because it's included in the selectedPersistently params
      if (this.selectedPersistently) {
        return this.selectedPersistently.includes(this.model.id);
      }
      return false;
    },
  ),
});
