import Component from '@ember/component';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import ListImageLoadingMixin from '../mixins/list-image-loading';

export default Component.extend(ListImageLoadingMixin, {
  classNames: ['event-wrap'],
  classNameBindings: ['domItemIsLoaded:fadein:out'],
  imageIsLoaded: '',
  productionModalType: equal('modalType', 'production'),
  longTitle: computed('model.name.length', function () {
    if (this.model.name.length > 30) {
      return 'long-name';
    }
    return '';
  }),
});
