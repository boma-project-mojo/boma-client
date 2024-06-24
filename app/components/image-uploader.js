import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { task } from 'ember-concurrency';

export default Component.extend({
  state: service(),

  isCordova: alias('state.isCordova'),

  /* 
   * uploadPhoto()
   *
   * Read the selected file as base64 and set the attributes
   * required for the image cropper and server upload. 
   */
  uploadPhoto: task(function* (file) {
    var self = this;
    try {
      file.readAsDataURL().then(function (url) {
        self.set('model.filename', file.name);
        self.set('model.filetype', file.type);
        self.set('uncroppedImage', url);
      });
    } catch (e) {
      console.log('serverErrors', e);
    }
  })
    .maxConcurrency(3)
    .enqueue(),

  /* 
   * useCameraImage()
   *
   * Get the base64 from the camera image and set attributes
   * ready for cropper.  
   */
  useCameraImage(image_base64) {
    // Reset the image
    this.set('model.image_base64', null);
    // Set the attributes required for the cropper
    this.set('uncroppedImage', image_base64);
  },

  actions: {
    /* 
     * uploadImage()
     *
     * Upload the chosen image 
     */
    uploadImage(file) {
      // Reset the image
      this.set('image_base64', null);
      // Upload the image.  
      this.uploadPhoto.perform(file);
    },

    /* 
     * resetImageUploader()
     *
     * Reset the image uploader
     */
    resetImageUploader() {
      this.set('uncroppedImage', null);
    },

    /* 
     * openCamera()
     *
     * Open the camera or gallery to select an image
     * 
     * sourceType     string      camera or album
     */
    openCamera(sourceType) {
      var pluginSourceType;
      if (sourceType === 'camera') {
        pluginSourceType = Camera.PictureSourceType.CAMERA;
      } else {
        pluginSourceType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
      }

      var self = this;
      const options = {
        quality: 100,
        destinationType: Camera.DestinationType.DATA_URL,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        correctOrientation: true,
        cameraDirection: Camera.Direction.FRONT,
        sourceType: pluginSourceType,
      };

      navigator.camera.getPicture(
        function (image_base64) {
          self.useCameraImage(`data:image/jpeg;base64,${image_base64}`);
        },
        function (a) {
          console.log(a);
        },
        options,
      );
    },
  },
});
