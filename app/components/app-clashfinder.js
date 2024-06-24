import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { htmlSafe } from '@ember/template';

export default Component.extend({
  showCanvas: true,
  showCanvasCSS: computed('showCanvas', function () {
    var CSS;

    if (this.showCanvas) {
      CSS = 'display:block;';
    } else {
      CSS = 'display:none;';
    }

    return htmlSafe(CSS);
  }),

  clashfinder: service('clashfinder'),
  preferenceToggle: service('preference-toggle'),

  clashfinderShownClass: alias('clashfinder.clashfinderShownClass'),
  padding: alias('clashfinder.padding'),

  // Check whether the selected day has events
  hasEvents: computed(
    'selectedCFDay',
    'eventsByVenueForClashfinder',
    'preferences',
    function () {
      if (
        typeof this.eventsByVenueForClashfinder[this.selectedCFDay] !==
        'undefined'
      ) {
        return true;
      } else {
        return false;
      }
    },
  ),

  /*
   * Launch the Clashfinder on didInsertElement and if events are listed 
   * on the selected day then scroll to now. 
   */
  didInsertElement() {
    this._super(...arguments);
    this.launchClashfinder();
    if (this.hasEvents === true) {
      this.clashfinder.cfScrollToNow(
        this.selectedCFDay,
        this.eventsByVenueForClashfinder[this.selectedCFDay].venues.length,
      );
    } else {
      this.set('showCanvas', false);
    }
  },

  /*
   * Relaunch the Clashfinder on didUpdateAttrs and if events are listed 
   * on the selected day then scroll to now. 
   */
  didUpdateAttrs() {
    this._super(...arguments);

    // Release the main canvas
    this.releaseKonvaCanvas(this.stage);
    // Release the venues canvas
    this.releaseHTML5Canvas(this.canvasVenues);
    // Release the time canvas
    this.releaseHTML5Canvas(this.canvasTime);

    if (this.hasEvents) {
      this.set('showCanvas', true);
      this.launchClashfinder();
      if (this.hasEvents === true) {
        this.clashfinder.cfScrollToNow(
          this.selectedCFDay,
          this.eventsByVenueForClashfinder[this.selectedCFDay].venues.length,
        );
      }
    } else {
      this.set('showCanvas', false);
    }
  },

  /*
   * Release all the canvases on willDestroyElement.
   */
  willDestroyElement() {
    this._super(...arguments);

    // Release the main canvas
    this.releaseKonvaCanvas(this.stage);
    // Release the venues canvas
    this.releaseHTML5Canvas(this.canvasVenues);
    // Release the time canvas
    this.releaseHTML5Canvas(this.canvasTime);
  },

  /*
    Initialise a canvases
  */
  initialiseCanvas(canvasHeight) {
    // get container
    let cfContainer = document.getElementById(`cf-events-canvases`);
    // set max width so overscroll doesn't happen
    cfContainer.style.width = window.innerWidth * 24 + 'px';
    cfContainer.style.height = canvasHeight + 'px';

    let eventsContainer = document.getElementById(`event-canvas`);

    // init Konva stage
    var stage = new Konva.Stage({
      container: eventsContainer,
      width: window.innerWidth + this.padding * 2,
      height: window.innerHeight,
    });
    this.set('stage', stage);
    window.stage = stage;

    // Initialise empty array for the links for this canvas
    this.links = new Array();
  },

  /*
    Launch the clashfinder 

    In this implementation there are three canvases
    1.  The time canvas - a short and wide canvas positioned to stick to the top of the clashfinder wrap 
    2.  The venues canvas - a canvas absolutely positioned behind the events canvas which is the same height
        as the events canvas but with fixed to the width of the screen, hence stays in position when scrolling
        left to right
    3.  The events canvas - a Konva canvas which shows the a subsection of a larger canvas that has all events
        rendered in the timeline.  The 'Camera' for the canvas is altered by the scroll event.  
  */
  launchClashfinder() {
    if (this.hasEvents) {
      var self = this;

      // Get width of device
      this.browserWidth = window.innerWidth;
      // Get ratio of device
      const ratio = window.devicePixelRatio;

      /*
      Styling Variables

      timelineHeight              Height of time series axis
      eventBoxHeight              The height of the bounding box around each event
      eventBoxPaddingX            The left and right padding inside the event bounding box
      eventBoxPaddingY            The top and bottom padding inside the event bounding box
      venueNameHeight             The height of the venue name
      venueNameColor              The colour of the venue name
      venueNameTextSize           The text size of the venue name
      eventBoxBackgroundColor     The background color of the event box
      eventBoxBorderColor         The border color of the event box
      eventTextSize               The text size of the event name and time
      eventNameTextColor          The colour of the event name text
      eventTimeTextColor          The colour of the event time text
      */

      // Get CSS variables which are set using the CSS params on the :root object.  
      // see params-overlay.css for more.
      let CSSVariables = getComputedStyle(document.documentElement);

      this.setProperties({
        timelineHeight: 30,
        eventBoxHeight: 50,
        eventBoxPaddingX: 10,
        eventBoxPaddingY: 10,
        eventBorderAtEndOfEvent: 3,
        venueNameHeight: 30,
        venueNameColor: CSSVariables.getPropertyValue(
          '--clashfinder-venue-name-color',
        ),
        venueNameTextSize: 13,
        eventBoxBackgroundColor: CSSVariables.getPropertyValue(
          '--clashfinder-event-box-background-color',
        ),
        eventBoxBorderColor: CSSVariables.getPropertyValue(
          '--clashfinder-event-box-border-color',
        ),
        eventTextSize: 13,
        eventNameTextColor: CSSVariables.getPropertyValue(
          '--clashfinder-event-name-text-color',
        ),
        eventTimeTextColor: CSSVariables.getPropertyValue(
          '--clashfinder-event-time-text-color',
        ),
        heartColor: `#FF6489`,
        fontName: CSSVariables.getPropertyValue('--clashfinder-font-name'),
        timeTextColor: CSSVariables.getPropertyValue(
          '--clashfinder-time-text-color',
        ),
        showHeart: false,
      });

      /*
      Time Canvas 

      A time canvas is created starting at festival.clashfinder_start_hour and ending 24 hours later

      For each hour segments are created for quarter hours.  
      */

      var hour, minute;

      // Get canvas
      this.canvasTime = document.getElementById('canvas-time');
      // Set canvas width at pixel ratio of device
      this.canvasTime.width = this.browserWidth * 24 * ratio;
      this.canvasTime.height = 30 * ratio;
      this.canvasTime.style.width = this.browserWidth * 24 + 'px';
      this.canvasTime.style.height = '30px';
      this.canvasTime.getContext('2d').scale(ratio, ratio);

      // Get ctx
      var ctxTime = this.canvasTime.getContext('2d');
      // Align the text left
      ctxTime.textAlign = 'left';
      // Check the width of a quarter of an hour
      var quarterHourWidth = this.browserWidth / 4;

      // The time the timeline start at is set on the festival model attribute 'clashfinder_start_hour
      // NB: server calculated event positions also use clashfinder_start_hour to set these values, if you 
      //     want to amend this you must also amend it serverside and recreate all couchdb records.
      var startHour = this.festival.clashfinder_start_hour;

      // for each hour in the day create the labels for the time series
      for (var h = 0; h < 24; h += 1) {
        if (h < 24 - startHour) {
          hour = h;
        } else {
          hour = h - 24;
        }
        // for each fifteen minute interval create an appropriate label
        for (var m = 0; m < 4; m += 1) {
          if (m == 0) {
            minute = `00`;
          } else {
            minute = `${m * 15}`;
          }

          ctxTime.fillStyle = this.timeTextColor;
          ctxTime.font = `bold 14px ${this.fontName}`;
          ctxTime.fillText(
            `${hour + startHour}:${minute}`,
            this.browserWidth * h + quarterHourWidth * m,
            20,
          );
        }
        m = 0;
      }

      /*
      Events Canvas

      The events canvas is created using two canvases.  
      a)  A venues canvas
      b)  An events canvase

      The venues canvas is rendered below the events canvas using CSS.  
      */
      var startPosition,
        x,
        y = null,
        width,
        height,
        i = 0;

      // Initialise empty object array to store data used to generate links 
      // for opening modals, see below for more.  
      this.links = {}; 

      // Get venues canvas
      this.canvasVenues = document.getElementById('canvas-venues');
      this.ctxVenues = this.canvasVenues.getContext('2d');

      // Set the heights of the events and venues canvases to be equal to the height of the venues
      // which have events on this day plus the safe area at the bottom so the bottom venue isn't
      // fouled by the bottom of the phone
      var canvasHeight =
        this.eventsByVenueForClashfinder[this.selectedCFDay]['venues'].length *
          81 +
        parseInt(CSSVariables.getPropertyValue(`--sab`));

      // Scale the canvas so that it doesn't looks blurred on retina screens
      this.canvasVenues.width = this.browserWidth * ratio;
      this.canvasVenues.height =
        this.eventsByVenueForClashfinder[this.selectedCFDay]['venues'].length *
        80 *
        ratio;
      this.canvasVenues.style.height =
        this.eventsByVenueForClashfinder[this.selectedCFDay]['venues'].length *
          80 +
        'px';
      this.canvasVenues.style.width = this.browserWidth + 'px';
      this.canvasVenues.getContext('2d').scale(ratio, ratio);

      // Order venues by the list order
      var orderedVenues =
        this.eventsByVenueForClashfinder[this.selectedCFDay]['venues'].sortBy(
          'list_order',
        );

      // Initialise the canvas and the Konva layer
      this.initialiseCanvas(canvasHeight);
      var layer = new Konva.Layer({
        listening: false,
      });
      this.set('layer', layer);

      // For each venue...
      for (const venue of orderedVenues) {
        if (venue.events) {
          // Create a label for the venue in the venues canvas
          this.ctxVenues.fillStyle = this.venueNameColor;
          this.ctxVenues.font = `bold ${this.venueNameTextSize}px ${this.fontName}`;
          this.ctxVenues.fillText(
            venue.venue_name_and_subtitle.toUpperCase(),
            10,
            i * 80 + 20,
          );

          // For each event at this venue
          for (var e of venue.events) {
            /*
              All positioning data is provided in percentages as these are calculated 
              serverside and need to be able to be responsive to the width of the viewport

              Canvases work in pixels hence all positioning data needs to be converted from
              perecent to px
            */

            // Convert the start position of the event from percentage to pixels
            startPosition = (e.eventStartPosition / 100) * this.browserWidth;
            x = startPosition;
            // Calculate the y position using the height of the venue name and the
            // bounding box for the event multiplied by an iterator which represents
            // how many venues this loop has processed.  Include the height of the timeline
            // as this is rendered above venues.  
            y =
              (this.venueNameHeight + this.eventBoxHeight) * i +
              this.timelineHeight;
            // Convert the event duration (i.e the width of the timeline event) to pixels.  
            // Leave a configurable gap at the end of an event so that consecutive events
            // have a visual break between the end of the one and the start of another.  
            width =
              (e.eventWidth / 100) * this.browserWidth -
              this.eventBorderAtEndOfEvent;
            // Get box height. 
            height = this.eventBoxHeight;

            // Create a block for each event using Konva.  
            var boundingBox = new Konva.Rect({
              x: x,
              y: y,
              fill: this.eventBoxBackgroundColor,
              width: width,
              height: height,
            });

            // If hearts are being shown.  
            var heartWidth = 0;
            if (this.showHeart === true) {
              // Add hearts for preferred events
              let heartAtts = {
                x: startPosition + this.eventBoxPaddingX,
                y: y + this.eventBoxPaddingY,
                fontSize: 33,
                fontFamily: 'FontAwesome',
                fill: this.heartColor,
              };

              // Add appropriate glyph depending on whether the event is preferred or not.  
              if (e.data.is_preferred === true) {
                heartAtts.text = '\uf004';
              } else {
                heartAtts.text = '\uf08a';
              }

              var heart = new Konva.Text(heartAtts);

              heartWidth = heart.width() + 20;
            }

            // Create text for eventName and eventTime
            // Calculate the text X and Y positions and text width.  
            var textX = startPosition + this.eventBoxPaddingX + heartWidth;
            var textY = y + this.eventBoxPaddingY;
            var textWidth = width - this.eventBoxPaddingX * 2 - heartWidth;

            // Render a Konva text object fo the event name text. 
            var eventNameText = new Konva.Text({
              x: textX,
              y: textY,
              width: textWidth,
              text: e.data.name.toUpperCase(),
              fontSize: this.eventTextSize,
              fontFamily: this.fontName,
              fill: this.eventNameTextColor,
              align: 'left',
              ellipsis: true,
              wrap: 'none',
              // If the event is cancelled draw a line through the text.  
              textDecoration: e.data.aasm_state === 'cancelled' ? 'line-through' : '',
            });

            // Render a Konva text object for the event time.  
            var eventTimeText = new Konva.Text({
              x: textX,
              y: y + 28,
              width: textWidth,
              text: e.data.event_time,
              fontSize: this.eventTextSize,
              fontFamily: this.fontName,
              fill: this.eventTimeTextColor,
              align: 'left',
              ellipsis: true,
              wrap: 'none',
              // If the event is cancelled draw a line through the text.  
              textDecoration: e.data.aasm_state === 'cancelled' ? 'line-through' : '',
            });

            // Add these elements fo the Konva layer
            layer.add(boundingBox);
            layer.add(eventNameText);
            layer.add(eventTimeText);
            if (this.showHeart) layer.add(heart);

            /*
             *  LINKS
             *
             *  Simple anchors aren't supported in canvas, instead we use the position of the 
             *  mouse pointer on click to cross reference against an array of the positions of
             *  all links on the canvas to calculate which modal should be opened.  
             * 
             *  Whilst looping through the venues and associated events generate an array of
             *  link positions to cross reference below in the onClick() function.  
            */
            var linkAttrs = {
              linkX: x,
              linkY: y,
              linkWidth: width,
              linkHeight: height,
              heartWidth: heartWidth,
              heartX: startPosition + this.eventBoxPaddingX,
              heartY: y + this.eventBoxPaddingY,
              isPreferred: e.data.is_preferred,
              eventId: e.data.event_id,
              productionId: e.data.production_id,
            };

            this.links.push(linkAttrs);
          }
          i++;
        }
      }

      // Add the layer to the Konva stage.
      this.stage.add(layer);

      // Handle the click/tap actions
      // eslint-disable-next-line no-inner-declarations
      function onClick() {
        var { x, y } = self.layer.getRelativePointerPosition();

        for (var i = self.links.length - 1; i >= 0; i--) {
          // Get link params back from array
          var attrs = self.links[i];

          // Check if cursor is in the link area
          if (
            x >= attrs.linkX &&
            x <= attrs.linkX + attrs.linkWidth &&
            y >= attrs.linkY &&
            y <= attrs.linkY + attrs.linkHeight
          ) {
            document.body.style.cursor = 'pointer';
            // If it is
            if (x > attrs.linkX && x <= attrs.linkX + attrs.heartWidth) {
              // If showHeart is enabled
              if (self.showHeart === true) {
                self.set('togglingPreference', true);
                self.set('heartAttrs', attrs);
              }
            } else {
              // Otherwise open the modal
              if (self.modalType === 'event') {
                self.eventId = attrs.eventId;
              } else if (self.modalType === 'production') {
                self.productionId = attrs.productionId;
              }
            }

            break;
          } else {
            // if the cursor isn't in a pointer location then initialise the pointer type and ids.
            document.body.style.cursor = '';
            self.productionId = '';
            self.eventId = '';
            self.togglingPreference = false;
            self.heartAttrs = null;
          }
        }

        // If a productionId has been set open the production modal
        if (self.productionId) {
          self.openProductionModal(self.productionId);
        }

        // If an eeventId has been set open the event modal
        if (self.eventId) {
          self.openEventModal(self.eventId);
        }

        if (self.togglingPreference) {
          // You can't amend items in the canvas without rerendering the entire canvas
          // which resets the scroll position.  

          // Instead erase the heart by painting it out with the same colour as the background
          // and then update it with the updated version.  
          var eraseHeart = new Konva.Rect({
            x: self.heartAttrs.heartX - 1,
            y: self.heartAttrs.heartY - 1,
            fill: self.eventBoxBackgroundColor,
            width: 40,
            height: 40,
          });

          // Then add hearts for amended event.
          let heartOpts = {
            x: self.heartAttrs.heartX,
            y: self.heartAttrs.heartY,
            fontSize: 33,
            fontFamily: 'FontAwesome',
            fill: self.heartColor,
          };

          if (self.heartAttrs.isPreferred === true) {
            heartOpts.text = '\uf08a';
          } else {
            heartOpts.text = '\uf004';
          }

          var updateHeart = new Konva.Text(heartOpts);

          self.layer.add(eraseHeart);
          self.layer.add(updateHeart);
          self.layer.draw();

          // Update the array
          self.links[i].isPreferred = !self.heartAttrs.isPreferred;

          // Set preference
          self.preferenceToggle.togglePreference(
            'event',
            self.heartAttrs.eventId,
          );
        }
      }

      // set the scroll action for the clashfinder view
      var sc = document.getElementById('cf-container');
      sc.addEventListener('scroll', this.clashfinder.handleScroll);

      // Set the click actions is links are enabled.
      if (!this.linkOnly) {
        this.stage.on('click', onClick);
      }
    }
  },

  /* 
   * releaseKonvaCanvas()
   *
   * Release a Konva canvas.
   * 
   * This is important because it preserves the available memory on the device
   * otherwise on multiple rendering of the clashfinder the iOS limits on canvas
   * size are triggered and the canvases don't render.  
   */
  releaseKonvaCanvas(canvas) {
    if (typeof canvas !== 'undefined') {
      canvas.width = 1;
      canvas.height = 1;
      if (typeof canvas !== 'undefined') canvas.destroy();
    }
  },

  /* 
   * releaseHTML5Canvas()
   *
   * Release a HTML5 canvas.
   * 
   * This is important because it preserves the available memory on the device
   * otherwise on multiple rendering of the clashfinder the iOS limited on canvas
   * size are triggered and the canvases don't render.  
   */
  releaseHTML5Canvas(canvas) {
    if (typeof canvas !== 'undefined') {
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx && ctx.clearRect(0, 0, 1, 1);
      canvas.destroy;
    }
  },
});
