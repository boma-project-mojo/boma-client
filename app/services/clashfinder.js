/* 
  This service concerns the function of the clashfinder events view.

  It contains 
    - functions to calculate various variables required to render the canvas,
    - functions for handling scroll actions
    - functions for scrolling the canvas to appropriate positions based on the date/time
    - functions which trigger rendering animations.  

 */

import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { later } from '@ember/runloop';

var padding = 400; // The amount of the canvas that is rendered outside of the viewport.
var ignoreScrollEvents = false;

export default Service.extend({
  padding: padding, // Exposed here for use in the app-clashfinder component
  pouchDb: service('pouch-db'),
  festivalId: alias('pouchDb.currentFestivalID'),
  store: service('store'),
  clashfinderShownClass: 'in', //Triggers the animations to fade in and out the clashfidner

  /* 
   * calculateDefaultGoToNowDay()
   *
   * events       array       An array of ember data Event model objects
   * 
   * Calculate the day the clashfinder should open on on first load.
   * 
   * If the festival is live return the date of the next upcoming event otherwise
   * return the first day of the festival
   */
  calculateDefaultGoToNowDay() {
    var defaultGoToNowDay;

    let now = new moment();

    // Get the festival pouchdb record
    let festival = this.store.peekRecord('festival', this.festivalId);

    // If the current time is after the start_date and before the end_date of the festival
      // set the defaultGoToNowDay as today
    // else
      // set the defaultGoToNowDay as the first day of the festival
    if (now > festival.start_date && now < festival.end_date) {
      defaultGoToNowDay = now.format('MMDD');
    } else {
      defaultGoToNowDay = moment(festival.start_date).format('MMDD')
    }

    this.set('selectedCFDay', defaultGoToNowDay);

    return this.selectedCFDay;
  },

  /* 
   * cfScrollToNow()
   *
   * Scroll the clashfinder canvas to show the correct day.  
   * either
   *  a) DURING FESTIVAL TIME.  Display the current day at the current time with a vertical line showing now. 
   *  b) BEFORE OR AFTER FESTIVAL TIME.  Display the first day of the festival at the first day.  
   */
  cfScrollToNow(dayToScrollTo, totalVenues) {
    var offsetForMargin; // The amount of pixels offset from 'now' that the clashfinder will be shown at.

    // Create a moment object for the dayToScrollTo with a start time set to match the festival.clashfinder_start_hour
    // to use to calculate the position the clashfinder should be opened at and position of the vertical line 'now' indicator
    let festival = this.store.peekRecord('festival', this.festivalId);
    let momentDayToScrollTo = moment(dayToScrollTo, 'MMDD').tz('Europe/London');

    let dayStart = momentDayToScrollTo.clone().set({
      h: festival.clashfinder_start_hour,
      m: 0,
      y: moment(festival.start_date).format('YYYY'),
    });

    var timeDiff = moment().diff(dayStart, 'hours');

    var scrollTo;

    // If the day currently being shown is the same as 'today'
      // scroll to the 'now' position in the timeline.
    // else
      // scroll to the first event taking place on this day.
    if (timeDiff > 0 && timeDiff < 24) {
      // Greater margin for best aesthetic when festival is live.
      offsetForMargin = 100;

      let now = moment().tz('Europe/London');

      // Set the position of the vertical line 'Now' indicator
      var cfNow = $('#cf-now');
      let nowInPx = now.diff(dayStart, 'minutes') * (window.innerWidth / 60);

      cfNow.removeClass().addClass(dayStart.format('ddd'));
      cfNow.css('left', nowInPx);

      // Set height of now indicator so that it covers all venues
      cfNow.css('height', totalVenues * 80 + 30);

      // Scroll to now
      scrollTo = nowInPx;
    } else {
      // Smaller margin for out of festival time for best aesthetic.
      offsetForMargin = 4;

      // convert minute per pixel
      scrollTo =
        this.firstEventsByDay[dayToScrollTo] * (window.innerWidth / 60);

      // UNCOMMENT TO TEST NOW INDICATOR WITHOUT TIME TRAVELING
      // // Now indicator
      // var cfNow = $("#cf-now");
      // let nowInPx = 720 * (window.innerWidth / 60)

      // cfNow.removeClass().addClass(dayStart.format('ddd'))
      // cfNow.css('left', nowInPx);

      // // Set height of now indicator so that it covers all venues
      // cfNow.css('height', totalVenues*80+40);
      // UNCOMMENT TO TEST NOW INDICATOR
    }

    // Adds a small amount of padding for aesthetic when opening on now
    scrollTo = scrollTo - offsetForMargin;

    // Adding a tiny delay to scroll to the first event because this fires before the element is ready
    // on preferences.
    later(() => {
      var container = document.getElementById('cf-container');
      container.scrollTo(scrollTo, 0);

      // The on scroll actions isn't triggered by scrollTo so we need to reposition the canvas stage manually.
      window.stage.container().style.transform =
        'translate(' + scrollTo + 'px, ' + '0px)';
      window.stage.x(-scrollTo);
      window.stage.y(0);
    }, 10);
  },

  /* 
   * eventStartPosition()
   *
   * startPositionInMins      int       The start position of the event in minutes.
   * 
   * The API provides the position as the number of minutes between the first
   * hour of this days clashfinder view and the start of the event.
   * 
   * This function converts the event start position into a percentage.
   */
  eventStartPosition(startPositionInMins) {
    var eventStartPosition = startPositionInMins * (100 / 60);
    return eventStartPosition;
  },

  /* 
   * eventWidth()
   *
   * durationInMins      int       The event duration in mins
   * 
   * The API provides the event duration in minutes
   * 
   * This function converts the duration into a percentage.
   */
  eventWidth(durationInMins) {
    var eventWidth = durationInMins * (100 / 60);
    return eventWidth;
  },

  /* 
   * handleScroll()
   * 
   * event      Obj       the scroll event object
   * 
   * Used to reposition the stage camera when a user scrolls on the X or Y axis.
   */
  handleScroll(event) {
    if (ignoreScrollEvents === true) {
      return false;
    }

    var dx = event.target.scrollLeft - padding;
    var dy = event.target.scrollTop;

    window.stage.container().style.transform =
      'translate(' + dx + 'px, ' + dy + 'px)';
    window.stage.x(-dx);
    window.stage.y(-dy);
  },

  /*
   * show()
   *
   * Animate the clashfinder canvases in.  
   */
  show() {
    this.set('clashfinderShownClass', 'in');

    // After a short timeout to let any momentum scroll events complete and for the fade in animation to complete
    // reenable the handleScroll events.
    later(() => {
      ignoreScrollEvents = false;
    }, 200);
  },

  /*
   * hide()
   *
   * Animate the clashfinder canvases out. 
   */
  hide() {
    // remove the scroll action event listener
    var sc = document.getElementById('cf-container');
    sc.removeEventListener('scroll', this.handleScroll);
    this.set('clashfinderShownClass', 'out');
    // Set ignore scroll events so that momentum scroll doesn't trigger the handleScroll
    // (it does this even though the event listener is removed on iOS)
    ignoreScrollEvents = true;
  },
});
