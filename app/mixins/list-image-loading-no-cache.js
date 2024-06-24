// DEPRECATED

import { set } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';
import { htmlSafe } from '@ember/string';

export default Mixin.create({
  placeholderHidden: '',
  imageIsLoaded: computed('_imageIsLoaded', 'model.image_loader', {
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

    // if(this.get('model.image_loader')){
    //   return 'image-loading';
    // }
  }),
  didUpdateAttrs() {
    this._super(...arguments);

    var el = $(`#${this.elementId}`);

    // Remove the class that fades in the list items as the attributes have been updated.
    el.removeClass('fadein');

    var self = this;
    $(this.element)
      .imagesLoaded({ background: '.embedded-image' })
      .done(function () {
        // Fade in the class that fades in the list items as the attributes have been updated.
        el.addClass('fadein');
        self.set('imageIsLoaded', 'image-is-loaded');
      })
      .fail(function () {
        // Fade in the class that fades in the list items as the attributes have been updated.
        // Fades in even if it fails as this is fail safe, the content is still shown.
        el.addClass('fadein');
        self.set('imageIsLoaded', 'image-loading-failed');
      });
  },
  didInsertElement() {
    this._super(...arguments);
    var self = this;
    var el = $(`#${self.elementId}`);
    $(this.element)
      .imagesLoaded({ background: '.embedded-image' })
      .done(function () {
        // Fade in the class that fades in the list items as the attributes have been updated.
        el.addClass('fadein');
        self.set('imageIsLoaded', 'image-is-loaded');
      })
      .fail(function () {
        // Fade in the class that fades in the list items as the attributes have been updated.
        // Fades in even if it fails as this is fail safe, the content is still shown.
        el.addClass('fadein');
        self.set('imageIsLoaded', 'image-loading-failed');
      });
  },
  image: computed('model.{image_loader,image_name_small}', function () {
    if (this.model.image_loader) {
      return htmlSafe(
        "background-image:url('" +
          this.model.image_name_small +
          "'), url('data:image/jpeg;base64," +
          this.model.image_loader +
          "')",
      );
    } else {
      return htmlSafe(
        "background-image:url('" + this.model.image_name_small + "')",
      );
    }
  }),
});
