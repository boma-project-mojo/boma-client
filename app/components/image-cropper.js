import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  //cropper configs
  windowWidth: computed(function () {
    return window.innerWidth;
  }),
  croppedAvatar: null,
  previewClass: '.img-preview',
  cropperContainer: '.cropper-container > img',
  aspectRatio: 1,
  crop: null,
  checkOrientation: true,
  viewMode: 0,
  dragMode: 'move',
  responsive: true,
  center: true,
  checkCrossOrigin: true,
  background: true,
  modal: true,
  guides: false,
  highlight: false,
  autoCrop: true,
  autoCropArea: 1,
  dragDrop: true,
  movable: true,
  resizable: true,
  zoomable: true,
  zoomOnWheel: true,
  zoomOnTouch: true,
  cropBoxMovable: true,
  cropBoxResizable: false,
  toggleDragModeOnDblclick: false,
  rotateable: true,
  minContainerWidth: computed(function () {
    return window.innerWidth - 15;
  }),
  minContainerHeight: computed(function () {
    return window.innerWidth - 15;
  }),
  minCropBoxWidth: 1000,
  minCropBoxHeight: 1000,
  minCanvasWidth: computed(function () {
    return window.innerWidth;
  }),
  minCanvasHeight: computed(function () {
    return window.innerHeight;
  }),
  build: null,
  built: null,
  dragStart: null,
  dragMove: null,
  dragEnd: null,
  zoomin: null,
  zoomout: null,
  ready: null,
  scalable: true,
  data: null,

  //initialize cropper on did insert element
  didInsertElement() {
    this._super(...arguments);
    let properties = {
      background: this.background,
      cropperContainer: this.cropperContainer,
      aspectRatio: this.aspectRatio,
      crop: this.crop,
      previewClass: this.previewClass,
      preview: this.previewClass,
      viewMode: this.viewMode,
      dragMode: this.dragMode,
      responsive: this.responsive,
      center: this.center,
      checkCrossOrigin: this.checkCrossOrigin,
      toggleDragModeOnDblclick: this.toggleDragModeOnDblclick,
      modal: this.modal,
      guides: this.guides,
      highlight: this.highlight,
      autoCrop: this.autoCrop,
      autoCropArea: this.autoCropArea,
      dragDrop: this.dragDrop,
      movable: this.movable,
      resizable: this.resizable,
      zoomable: this.zoomable,
      zoomOnWheel: this.zoomOnWheel,
      zoomOnTouch: this.zoomOnTouch,
      cropBoxMovable: this.cropBoxMovable,
      cropBoxResizable: this.cropBoxResizable,
      rotateable: this.rotateable,
      minContainerWidth: this.minContainerWidth,
      minContainerHeight: this.minContainerHeight,
      minCropBoxWidth: this.minCropBoxWidth,
      minCropBoxHeight: this.minCropBoxHeight,
      minCanvasWidth: this.minCanvasWidth,
      minCanvasHeight: this.minCanvasHeight,
      build: this.build,
      built: this.built,
      dragStart: this.dragStart,
      dragMove: this.dragMove,
      dragEnd: this.dragEnd,
      zoomin: this.zoomin,
      zoomout: this.zoomout,
      ready: this.ready,
      data: this.data,
      scalable: this.scalable,
    };

    let image = document.querySelector(properties['cropperContainer']);
    this.set('cropper', new Cropper(image, properties));
  },
  willDestroyElement() {
    this._super(...arguments);
    let cropper = this.cropper;
    if (cropper['data']) {
      cropper.destroy();
    }
  },
});
