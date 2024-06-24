/* 
Form Service

Used when creating form user experiences within the app.  

This service handles the navigation between form panes and the breadcrumb.  

Documentation detailing how to use this service and the associated components can be found in the project README.
https://gitlab.com/boma-hq/boma-client-v2#form-navigation-and-breadcrumb
*/

import Service from '@ember/service';
import $ from 'jquery';

export default Service.extend({
  // Default initial values for the form pane indexes
  currentPaneIndex: 0,
  nextPaneIndex: 1,
  prevPaneIndex: -1,
  // Initialise an empty formPanes array.
  formPanes: [],

  /*
   * initializeFlickity()
   *
   * Initialise the flickity plugin that handles the animation between the form panes
   */
  initializeFlickity() {
    var flkty = new Flickity('#form-wrap', {
      draggable: false,
      selectedAttraction: 0.05,
      friction: 0.35,
    });
    this.set('flkty', flkty);
  },

  /*
   * registerFormElement()
   *
   * id     The id of the form element    string
   *
   * This is called when each {{form-pane}} component is initialised, it registers the form pane into
   * an array which is used to calculate the next and previous form panes and for navigating to a specific
   * form pane.
   */
  registerFormElement(id) {
    var formPanes = this.formPanes;
    formPanes.push(id);
    this.set('formPanes', formPanes);
  },
  /*
   * validateAttrs()
   *
   * Validate the attributes provided against the validation configuration for the controller provided
   * using ember-cp-validation.
   *
   * attrs        A comma separated list of attribute names that need to be validated           String
   * controller   The controller that contains the ember-cp-validations config for this form    EmberController
   */
  validateAttrs(attrs, controller) {
    return controller.validate({ on: attrs }).then((validations) => {
      return validations;
    });
  },
  /*
   * validateThenNext()
   *
   * Validate the attributes provided against the validation configuration for the controller provided
   * using ember-cp-validation.  Handle the errors if there are any or navigate to the next form pane.
   *
   * attrs        A comma separated list of attribute names that need to be validated           String
   * controller   The controller that contains the ember-cp-validations config for this form    EmberController
   */
  validateThenNext(attrs, controller) {
    return this.validateAttrs(attrs, controller).then((results) => {
      if (results.validations.isValid === false) {
        return results.validations.errors;
      } else {
        this.next();
      }
    });
  },
  /*
   * next()
   *
   * navigate to the next form pane.
   */
  next() {
    var nextPaneIndex = this.nextPaneIndex;
    var formPanes = this.formPanes;

    if (nextPaneIndex > formPanes.length - 1) return;

    this.toggleIsLeavingClasses(this.flkty);
    this.flkty.next();
    this.resizeSlides();

    this.setIndexes(nextPaneIndex, nextPaneIndex + 1, nextPaneIndex - 1);
  },
  /*
   * prev()
   *
   * navigate to the previous form pane.
   */
  prev() {
    var prevPaneIndex = this.prevPaneIndex;

    if (prevPaneIndex < 0) return;

    this.toggleIsLeavingClasses(this.flkty);
    this.flkty.previous();

    this.setIndexes(prevPaneIndex, prevPaneIndex + 1, prevPaneIndex - 1);
  },
  /*
   * goTo()
   *
   * go to a specific form pane.
   */
  goTo(id) {
    var formPanes = this.formPanes;

    $(formPanes.join()).hide();
    $(id).show();

    var newPageIndex = formPanes.indexOf(id);

    this.setIndexes(newPageIndex, newPageIndex + 1, newPageIndex - 1);
  },
  /*
   * setIndexes()
   *
   * current    the current pane index    integer
   * next       the next pane index       integer
   * previous   the previous pane index   integer
   *
   * go to a specific form pane.
   */
  setIndexes(current, next, prev) {
    this.set('currentPaneIndex', current);
    this.set('nextPaneIndex', next);
    this.set('prevPaneIndex', prev);
  },
  /*
   * resetForm()
   *
   * reinitialise the form.
   */
  resetForm() {
    this.setIndexes(0, 1, -1);
    this.set('formPanes', []);
  },
  /*
   * toggleIsLeavingClasses()
   *
   * adds the is-leaving class to the form pane to trigger the 
   * zoominoutsinglefeatured animation.
   */
  toggleIsLeavingClasses(flkty) {
    $(
      flkty.slides.map((slide) => {
        return slide.cells[0].element;
      }),
    ).removeClass('is-leaving');
    $(flkty.selectedSlide.cells[0].element).addClass('is-leaving');
  },
  /* 
   * resizeSlides()
   *
   * Reset the height of the slides, used to resolve a bug with android devices where
   * the bottom portion of the slide isn't visible when a user navigates to the next pain
   * when the android soft keyboard io open
   */
  resizeSlides(){
    var self = this;
    this.flkty.on( 'settle', function() {
      self.flkty.resize();
    });
  },

  /**************** IMAGE UPLOADER METHODS *****************/

  /**************** fabricJs *****************/
  /*
   * calculateMultiplierRatio()
   *
   * canvasWidth      the width of the current fabricjs canvas      integer
   *
   * The image backgrounds used in the fabricjs image editor are 1000px wide,
   * this is to calculate how much we can scale them up without pixelating the image.
   */
  calculateMultiplierRatio(canvasWidth) {
    return 1000 / canvasWidth;
  },
  /*
   * getFabricJSCanvas()
   *
   * fabricjsCanvas      the fabricJs object      fabricJs object
   *
   * Get the base64 encoded version of the fabricjs image that has been created using the editor.
   */
  getFabricJSCanvas(fabricjsCanvas) {
    return fabricjsCanvas.toDataURL({
      enableRetinaScaling: true,
      format: 'jpeg',
      quality: 1,
      multiplier: this.calculateMultiplierRatio(fabricjsCanvas.width),
    });
  },

  /**************** cropper.js *****************/
  /*
   * getCroppedCanvas()
   *
   * cropper      the cropper.js object      cropper.js object
   *
   * Get the base64 encoded cropped image.
   */
  getCroppedCanvas(cropper) {
    var croppedImage = cropper.getCroppedCanvas({
      width: 1000,
      height: 1000,
    });
    return croppedImage.toDataURL();
  },
});
