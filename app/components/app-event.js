import Component from '@ember/component';
import { equal } from '@ember/object/computed';
import ListImageLoadingMixin from '../mixins/list-image-loading';

export default Component.extend(ListImageLoadingMixin,{
  classNames: ['event-wrap', 'grid'],
  classNameBindings: ['domItemIsLoaded:fadein:out'],
  productionModalType: equal('modalType', 'production'),
});
