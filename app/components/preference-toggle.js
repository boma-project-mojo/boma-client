import { inject as service } from '@ember/service';
import Component from '@ember/component';
import { alias } from '@ember/object/computed';

export default Component.extend({
  tagName: '',
  store: service('store'),
  preferenceToggle: service('preference-toggle'),
  beat: alias('preferenceToggle.beat'),
  tokenService: service('token'),
  init() {
    try {
      this.set('model', this.store.peekRecord(this.modelName, this.modelId));
    } catch (err) {
      console.log(err);
    }
    this._super(...arguments);
  },
  actions: {
    togglePreference: function () {
      this.preferenceToggle.togglePreference(this.modelName, this.model.id);
    },
  },
});
