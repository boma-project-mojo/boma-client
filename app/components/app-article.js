import Component from '@ember/component';
import ListImageLoadingMixinNoCache from '../mixins/list-image-loading-no-cache';

export default Component.extend(ListImageLoadingMixinNoCache, {
  classNames: ['article-wrap'],
});
