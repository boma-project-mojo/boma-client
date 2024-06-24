import Component from '@ember/component';
import ListImageLoadingMixin from '../mixins/list-image-loading';

export default Component.extend(ListImageLoadingMixin, {
  classNames: ['article-wrap'],
  classNameBindings: ['domItemIsLoaded:fadein:out'],
});
