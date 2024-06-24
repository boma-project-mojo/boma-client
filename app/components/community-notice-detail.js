import { inject as service } from '@ember/service';
import Component from '@ember/component';
import ENV from 'boma/config/environment';
import { later, cancel } from '@ember/runloop';
import ReportActivity from '../mixins/report-activity';

export default Component.extend(ReportActivity, {
  store: service('store'),
  placeholderHidden: '',

  /* 
   * Pinch Zoom for Images
   *
   * The following code implements a pinch zoom for the image contained within this modal.  
   * It uses the code provided at https://apex.oracle.com/pls/apex/vmorneau/r/pinch-and-zoom/pinch-and-zoom-js
   */ 
  pinchZoom(imageElement){
    var self = this;

    let imageElementScale = 1;
  
    let start = {};
  
    // Calculate distance between two fingers
    const distance = (event) => {
      return Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
    };
  
    imageElement.addEventListener('touchstart', (event) => {
      if (event.touches.length === 2) {
        event.preventDefault(); // Prevent page scroll
  
        // This is used to disable the closeModal action if the gestures relate to panning a zoomed image.  
        self.set('isZoomingImage', true);

        // Calculate where the fingers have started on the X and Y axis
        start.x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
        start.y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
        start.distance = distance(event);
      }
    });
  
    imageElement.addEventListener('touchmove', (event) => {
      if (event.touches.length === 2) {
        event.preventDefault(); // Prevent page scroll
  
        // Safari provides event.scale as two fingers move on the screen
        // For other browsers just calculate the scale manually
        let scale;
        if (event.scale) {
          scale = event.scale;
        } else {
          const deltaDistance = distance(event);
          scale = deltaDistance / start.distance;
        }
        imageElementScale = Math.min(Math.max(1, scale), 4);
  
        // Calculate how much the fingers have moved on the X and Y axis
        const deltaX = (((event.touches[0].pageX + event.touches[1].pageX) / 2) - start.x); // x2 for accelerated movement
        const deltaY = (((event.touches[0].pageY + event.touches[1].pageY) / 2) - start.y); // x2 for accelerated movement
  
        // Transform the image to make it grow and move with fingers
        const transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${imageElementScale})`;
        imageElement.style.transform = transform;
        imageElement.style.WebkitTransform = transform;
        imageElement.style.zIndex = "9999";
      }
    });
  
    imageElement.addEventListener('touchend', (event) => {
      // Reset image to it's original format
      imageElement.style.transform = "";
      imageElement.style.WebkitTransform = "";
      imageElement.style.zIndex = "";

      // This is used to disable the closeModal action if the gestures relate to panning a zoomed image.  
      // The timeout is because the closeModal action is also run on touchend.  
      setTimeout(()=>{
        self.set('isZoomingImage', false);
      }, 100)
    });
  },

  init() {
    this.set('article', this.store.peekRecord('article', this.articleID));
    this._super(...arguments);
  },
  didInsertElement() {
    this._super(...arguments);

    var self = this;

    // Fallback if article hasn't been synced yet.
    if (!this.article) {
      this.closeModal();
    }

    $(this.element)
      .imagesLoaded()
      .done(function () {
        self.set('imageIsLoaded', 'image-is-loaded');
        var hidingPlaceholderTimeout = later(function () {
          self.set('placeholderHidden', 'hidden');
        }, 333);
        self.set('hidingPlaceholderTimeout', hidingPlaceholderTimeout);
      });

    // Initialise the Pinch Zoom for the Image. 
    this.pinchZoom(this.element.getElementsByClassName('image')[0]);
  },
  willDestroyElement() {
    cancel(this.hidingPlaceholderTimeout);
    this._super(...arguments);
  },
});
