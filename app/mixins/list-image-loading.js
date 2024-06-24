/* 

List image loading Mixin

Handle the loading of images and the fading animations of the list items.

*/

import { set } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';
import { later, next } from '@ember/runloop';

export default Mixin.create({
  placeholderHidden: '',
  domItemIsLoaded: false,
  // Check if the image has been loaded 
  imageIsLoaded: computed('_imageIsLoaded', 'model.image_loader', 'model', {
    get() {
      var imageIsLoaded;
      if (this.model != undefined) {
        if (this._imageIsLoaded) {
          imageIsLoaded = this._imageIsLoaded;
        }

        if (this.model.image_loader) {
          imageIsLoaded = 'image-loading';
        }
      }
      return imageIsLoaded;
    },

    set(key, value) {
      return set(this, '_imageIsLoaded', value);
    },
  }),
  // Handle fading in DOM element and image loading when attributes change
  didUpdateAttrs() {
    this._super(...arguments);

    this.fadeInDOMElement();
    this.handleImageLoading();
  },
  // Handle fading in DOM element and image loading on didInsertElement
  didInsertElement() {
    this._super(...arguments);
    this.fadeInDOMElement();
    this.handleImageLoading();
  },
  image: reads('model.image'),
  image_thumb: reads('model.image_thumb'),
  image_loader: computed('model.image_loader', function () {
    if (this.model.image_loader) {
      return htmlSafe(
        "background-image: url('data:image/jpeg;base64," +
          this.model.image_loader +
          "');",
      );
    } else {
      return false;
    }
  }),

  /* 
   * fadeInDOMElement()
   *
   * Set the domItemIsLoaded which triggers the fading in of the related dom element.  
   * see list item components classNameBindings for more.  
   */
  fadeInDOMElement() {
    this.set('domItemIsLoaded', false);

    // Remove the class that fades in the list items as the attributes have been updated.
    // el.removeClass('fadein')
    // After a small pause to allow the removeClass method to complete
    // add the class that fades in the list items as the attributes have been updated.
    next(this, function () {
      this.set('domItemIsLoaded', true);
    });
  },
  /* 
   * handleImageLoading()
   *
   * Use the imageIsLoaded library to watch when images are loaded and when loaded replace the 
   * loading placeholders with the true images.  
   */
  handleImageLoading() {
    var self = this;

    // Reset the imageIsLoaded to the loading state
    if (
      self.get('imageIsLoaded') === 'image-is-loaded' ||
      self.get('imageIsLoaded') === 'image-loading-failed'
    ) {
      self.set('imageIsLoaded', 'image-loading');
    }

    try {
      if (this.model && this.model.image) {
        this.model.image.then(() => {
          later(() => {
            $(`#${this.model.constructor.modelName}-${this.model.id}`)
              .imagesLoaded({ background: true })
              .done(function () {
                self.set('imageIsLoaded', 'image-is-loaded');
              })
              .fail(function () {
                self.set('imageIsLoaded', 'image-loading-failed');
              });
          }, 1);
        });
      }
    } catch (err) {
      console.log(err);
    }
  },
});
