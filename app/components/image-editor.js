import Component from '@ember/component';

export default Component.extend({
  didInsertElement() {
    this._super(...arguments);
    var self = this;
    const box_height = window.innerWidth - 32;

    // StaticCanvas

    // Initialise a fabric canvas
    var canvas = new fabric.Canvas('c');
    canvas.selection = false;
    canvas.setDimensions({ width: box_height, height: box_height });

    // Get the base64 for the default background image.
    var imgUrl = this.backgroundImages.images[0].base64;

    // Set the canvas background to the default image.
    fabric.Image.fromURL(imgUrl, (img) => {
      img.set({
        left: 0,
        top: 0,
      });
      img.selectable = false;
      img.scaleToHeight(box_height);
      img.scaleToWidth(box_height);
      canvas.add(img);

      canvas.sendToBack(img);

      this.set('imageObject', img);
    });

    // Subclass fabric.Textbox to create a limited text box that
    // has a maximum number of lines.  
    const LimitedTextbox = fabric.util.createClass(fabric.Textbox, {
      onKeyDown: function (e) {
        // If the number of lines is greater than the maximum lines provided
          // Prevent the newline.  
        if (this._textLines.length === this.maxLines) {
          if (e.code === 'Enter') {
            e.preventDefault();
            return false;
          }
        }

        // Call parent class method
        this.callSuper('onKeyDown', e);
      },
    });

    // Load the font 
    var myfont = new FontFaceObserver(self.get('fontFamily'));
    myfont
      .load()
      .then(function () {
        // when font is loaded, create a limitedTextBox
        var textbox = new LimitedTextbox(self.get('textPlaceholder'), {
          height: window.innerWidth - 160,
          width: window.innerWidth - 160,
          fontSize: 20,
          lockMovementX: true,
          lockMovementY: true,
          hasControls: false,
          hasBorders: false,
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          top: 80,
          left: 80,
          fill: '#fefefe',
          fontFamily: self.get('fontFamily'),
          maxLines: 12,
          maxWidth: 2,
        });

        // Set a max number of characters.  
        textbox.on('editing:entered', () => {
          textbox.hiddenTextarea.setAttribute('maxlength', 270);
        });

        // Return the scroll position to the top when finished editing
        // to handle issues with screen pan and zoom when soft keyboard 
        // Is open.  
        textbox.on('editing:exited', () => {
          window.scrollTo(0, 0);
        });

        // Clear the placeholder text when entering text.  
        canvas.on('text:editing:entered', clearText);

        function clearText(e) {
          if (e.target.type === 'textbox') {
            if (e.target.text === self.get('textPlaceholder')) {
              setTimeout(function () {
                e.target.selectAll();
                e.target.text = '';
                canvas.renderAll();
              }, 50);
            }
          }
        }

        canvas.bringToFront(textbox);
        canvas.add(textbox).setActiveObject(textbox);
        canvas.centerObject(textbox);

        canvas.getActiveObject().set('fontFamily', self.get('fontFamily'));
        canvas.requestRenderAll();

        // Start editing the canvas when clicked.  
        canvas.on('mouse:down', setFocus);

        function setFocus() {
          textbox.enterEditing();
          textbox.hiddenTextarea.focus();
        }

        self.set('textbox', textbox);
      })
      .catch(function (e) {
        console.log(e);
      });

    this.set('canvas', canvas);
    this.set('fabricjs', canvas);
  },
  /* 
   * setImage()
   *
   * Set the background image for the editor
   * 
   * imageUrl       base64      The image that should be behind the editor
   */
  setImage(imageUrl) {
    var imageObject = this.imageObject;
    var canvas = this.canvas;
    imageObject.setSrc(imageUrl, function () {
      canvas.renderAll();
    });
  },
  /* 
   * setTextColor()
   *
   * Set the text colour for the editor
   * 
   * color       hex      The colour to change to
   */
  setTextColor(color) {
    var canvas = this.canvas;
    var textbox = this.textbox;
    textbox.set('fill', color);
    canvas.requestRenderAll();
  },
  /* 
   * calculateMultiplierRatio()
   *
   * Images created in this editor need to be scaled up to get a higher resolution
   * copy for uploading to the server.  
   */
  calculateMultiplierRatio() {
    return 1000 / window.innerWidth;
  },
  /* 
   * getBase64Image()
   *
   * Get the base64 of the canvas ready to upload
   */
  getBase64Image() {
    var canvas = this.canvas;
    return canvas.toDataURL({
      enableRetinaScaling: true,
      format: 'jpeg',
      quality: 1,
      multiplier: this.calculateMultiplierRatio(),
    });
  },
  actions: {
    setImage(imageUrl) {
      this.setImage(imageUrl);
    },
    setTextColor(color) {
      this.setTextColor(color);
    },
    /* 
     * getImage()
     *
     * Finalise editing and set the imageBase64 attribute ready 
     * for upload to the server.  
     */
    getImage() {
      this.set('imageBase64', this.getBase64Image());
    },
  },
});
