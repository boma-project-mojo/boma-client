import Component from '@ember/component';
import { computed } from '@ember/object';
import RecognizerMixin from 'ember-gestures/mixins/recognizers';
import ImagesLoaded from 'imagesloaded';

export default Component.extend(RecognizerMixin, {
  classNames: ['community-event-wrap'],
  imageIsLoaded: '',
  didUpdateAttrs() {
    this._super(...arguments);
    this.set('imageIsLoaded', '');
    ImagesLoaded(this.$('embedded-image'), () => {
      this.set('imageIsLoaded', 'image-is-loaded');
    });
  },
  /* 
   * showImage
   *
   * Community Events can optionally have no image attached.  
   * This computed property returns true if an image should be 
   * rendered.
   */
  showImage: computed('model.image_thumb', async function () {
    return await this.model.image_thumb.then(function (image) {
      if (image !== false) {
        return true;
      } else {
        return false;
      }
    });
  }),
  didInsertElement() {
    this._super(...arguments);
    ImagesLoaded(this.$('embedded-image'), () => {
      this.set('imageIsLoaded', 'image-is-loaded');
    });
  },
});
