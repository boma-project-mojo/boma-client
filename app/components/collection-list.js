import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { gt } from '@ember/object/computed';
import $ from 'jquery';

export default Component.extend({
  classNames: [],

  headerService: service('header'),

  scrollBottom: 0,
  bottom: 0,
  buffer: 1,
  didInsertElement() {
    this._super(...arguments);
    // Calculate the full height of the list and the height of the 
    // viewport window without the header.  
    // These are used to calculate the position of the bottom of the list.  
    let fullHeightOfList = $(this.element)
      .find('.list')
      .children()
      .children()
      .children()
      .height();
    let heightOfWindowWithoutHeader = $(this.element)
      .find('.list')
      .children()
      .children()
      .height();
    this.set('listBottom', fullHeightOfList - heightOfWindowWithoutHeader);
  },
  didUpdateAttrs() {
    this._super();
    // see above
    let fullHeightOfList = $(this.element)
      .find('.list')
      .children()
      .children()
      .children()
      .height();
    let heightOfWindowWithoutHeader = $(this.element)
      .find('.list')
      .children()
      .children()
      .height();
    this.set('listBottom', fullHeightOfList - heightOfWindowWithoutHeader);
  },

  /* 
   * clientWidth
   *
   * Calculate the width of the viewport minus 8 px for padding.
   */
  clientWidth: computed(function () {
    let borderWidth = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--list-border-width',
      ),
    ) *
      2

    return window.innerWidth - borderWidth;
  }),
  /* 
   * clientHeight
   *
   * Calculate the height of the viewport
   */
  clientHeight: computed(function () {
    return window.innerHeight;
  }),
  /* 
   * itemWidth
   *
   * Calculate the width of an item for the appropriate
   * display format.
   */
  itemWidth: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      return (
        window.innerWidth -
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--list-border-width',
          ),
        ) *
          2
      );
    } else if (this.displayFormat === 'single-column') {
      return (
        window.innerWidth -
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--list-border-width',
          ),
        ) *
          2
      );
    } else {
      return Math.floor(
        window.innerWidth / 2 -
          parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--list-border-width',
            ),
          ),
      );
    }
    // -2;
    // return ($('#main-outlet-wrapper').width()/2)-2; //with margin
  }),
  
  /* 
   * itemHeight
   *
   * Calculate the height of an item for the appropriate
   * display format.
   * 
   * NB Duplicated here from events.js controller as it's required for both 
   * scrollToNow functionality and setting ember-collection height.
   */
  itemHeight: computed('displayFormat', function () {
    if (this.displayFormat === 'list') {
      // Get the height of a list style item
      let listStyleItemHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--list-style-item-height',
        )
      )
      // Get the width of a border
      let listStyleItemBorderWidth = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--list-border-width',
        ),
      )
      // Return the height of the list style item + the top and bottom borders
      return listStyleItemHeight + listStyleItemBorderWidth * 2;
    } else if (this.displayFormat === 'single-column') {
      return window.innerWidth - 8;
    } else {
      return Math.floor(window.innerWidth / 2 - 4);
    }
    // -2;
    // return ($('#main-outlet-wrapper').width()/2)-2; //with margin
  }),

  // Check if the list is shorter than the height of the viewport.
  listShorterThan100vh: computed(
    'displayFormat',
    'itemHeight',
    'model.length',
    function () {
      var listShorterThan100vh;
      if (this.model) {
        let windowHeight = window.innerHeight;
        let totalItems =
          this.displayFormat === 'list' || this.displayFormat === 'single-column'
            ? this.model.length
            : this.model.length / 2;
        let itemTotalHeight = totalItems * this.itemHeight;

        let threshold = this.itemHeight;

        if (windowHeight + threshold > itemTotalHeight) {
          listShorterThan100vh = true;
        }
      }
      return listShorterThan100vh;
    },
  ),

  hasRecords: gt('model.length', 0),
  actions: {
    /* 
     * scrollChange()
     *
     * This action is fired each time the scroll position changes on 
     * an ember-collection list.  
     */
    scrollChange: function (x, y) {
      var bottom = this.listBottom;

      var scrollTop = y;

      var threshold = 100;

      // If the scroll position is moving upwards or
      // if the scroll position is less than or exactly 0 or
      // if the list is shorter than the height of the page
        // show the header
      // else if the position is moving downwards or
      // the scroll position is at the bottom of the list
        // hide the header
      if (
        scrollTop < this.scrollTop - 53 ||
        scrollTop < 0 ||
        scrollTop === 0 ||
        this.listShorterThan100vh === true //If the list is shorter than 100vh then a CSS class is added to the wrapper which restricts the height of the list, this logic allows a user to scroll inside the short list without the header toggling.
      ) {
        this.headerService.showHeader();
      } else if (
        scrollTop > this.scrollTop + threshold || //hide header when scrolling up quickly
        scrollTop > bottom - this.itemHeight //hide header when at bottom of the list so that not only part of the event is shown
      ) {
        this.headerService.hideHeader();
      }

      this.set('scrollTop', scrollTop);
    },
  },
});
