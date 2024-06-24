import Component from '@ember/component';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';
import { later } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default Component.extend({
  router: service(),
  classNames: ['appModalImageWrap'],
  imageIsLoaded: '',
  placeholderHidden: '',

  init() {
    this._super(...arguments);

    // Expose this ember component via window so that it can be used inside the 'backbutton' event listener
    // which is created in the app-left-sidebar component.
    window.router = this.router;
    window.self = this;
  },

  /* 
   * Images load with a blurred placeholder image.
   *
   * Use the imagesLoaded plugin to check whether images 
   * have been successfully loaded and when loaded replace the
   * blurred placeholder image with the true image.
   */
  didInsertElement() {
    this._super(...arguments);
    var self = this;
    if (this.model) {
      this.model.image.then(() => {
        later(() => {
          $(self.element)
            .find('.appModalImage')
            .imagesLoaded({ background: true })
            .done(function () {
              self.set('imageIsLoaded', 'image-is-loaded');
              self.set('placeholderHidden', 'hiding');
              var hidingPlaceholderTimeout = later(function () {
                self.set('placeholderHidden', 'hidden');
              }, 333);
              self.set('hidingPlaceholderTimeout', hidingPlaceholderTimeout);
            })
            .fail(function () {
              self.set('imageIsLoaded', 'image-is-loaded');
            });
        }, 1);
      });
    }
  },
  didReceiveAttrs() {
    this._super();
    var self = this;
    if (this.model) {
      this.model.image.then(() => {
        later(() => {
          $(self.element)
            .find('.appModalImage')
            .imagesLoaded({ background: true })
            .done(function () {
              self.set('imageIsLoaded', 'image-is-loaded');
              self.set('placeholderHidden', 'hiding');
              var hidingPlaceholderTimeout = later(function () {
                self.set('placeholderHidden', 'hidden');
              }, 333);
              self.set('hidingPlaceholderTimeout', hidingPlaceholderTimeout);
            })
            .fail(function () {
              var hidingPlaceholderTimeout = later(function () {
                self.set('placeholderHidden', 'hidden');
              }, 333);
              self.set('hidingPlaceholderTimeout', hidingPlaceholderTimeout);
              self.set('imageIsLoaded', 'image-is-loaded');
              console.log('all images loaded, at least one is broken');
            });
        }, 1);
      });
    }
  },
  image: reads('model.image'),
  image_loader: computed('model.image_loader', function () {
    var image_loader = false;
    if (this.model.image_loader) {
      image_loader = htmlSafe(
        "background-image: url('data:image/jpeg;base64," +
          this.model.image_loader +
          "');",
      );
    }
    return image_loader;
  }),
});
