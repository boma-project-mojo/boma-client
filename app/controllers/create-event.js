/* 
Create Event Controller

Used for when creating events to be submitted to the Community Events section of the app.  
*/

import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import RSVP from 'rsvp';
import { debounce } from '@ember/runloop';
import ENV from 'boma/config/environment';
import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import { validator, buildValidations } from 'ember-cp-validations';
import { alias } from '@ember/object/computed';
import $ from 'jquery';
import GoToRouteMixin from '../mixins/go-to-route';

/*
 * Validations
 *
 * This is the configuration for ember-cp-validators (https://github.com/adopted-ember-addons/ember-cp-validations)
 *
 * It ensures valid data is provided.  Where data is invalid error messages are shown to the user and they are prevented from
 * navigating forward to the next form pane.
 *
 */
const Validations = buildValidations({
  'event.name': [
    validator('presence', {
      presence: true,
      message: 'Please give your event a name',
    }),
    validator('length', {
      max: 80,
      message: 'Sorry, your event name is too long',
    }),
  ],
  'event.description': validator('presence', {
    presence: true,
    message: 'Please give your event a description',
  }),
  'event.start_time': validator('presence', {
    presence: true,
    message: 'Give your event a start time',
  }),
  venue: validator('presence', {
    presence: true,
    message: "Oops, you didn't select a venue!",
  }),
  'event.external_link': validator('format', {
    allowBlank: equal('model.event.event_format', 'physical'),
    regex:
      /[a-zA-Z0-9][a-zA-Z-0-9]*(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-{}]*[\w@?^=%&amp;/~+#-{}])??/,
    message: "Sorry, this link isn't valid",
  }),
});

export default Controller.extend(GoToRouteMixin, Validations, {
  // Include the form service
  formService: service('form'),
  // get the API endpoint from config
  apiEndpoint: ENV['apiEndpoint'],
  // get the festivalId from the pouchdb service
  pouchDb: service('pouch-db'),
  festival_id: alias('pouchDb.currentFestivalID'),
  // Loading states
  loading: false,
  editingAddress: false,
  // Cropper default state
  cropper: null,

  ps: equal('event.event_format', 'physical'),
  /*
   *
   * The app can be configured so that only token holders can submit community events.
   * To enable set tokenRestrictionsEnabled to true
   *
   */
  tokenRestrictionsEnabled: false,
  requiresToken: computed(
    'model.tokens.length',
    'tokenRestrictionsEnabled',
    function () {
      return (
        this.model.tokens.length > 0 && this.tokenRestrictionsEnabled === true
      );
    },
  ),

  /*
   *
   * Publisher token holders are allowed to bypass the moderation process for submissions (their submissions are published by default)
   *
   * This is used to show them an alert to remind them of this before they make submissions.
   *
   */
  is_publisher: computed('model.tokens', function () {
    var publisherToken = this.model.tokens.filter((token) => {
      if (token.tokentype_id === 3) {
        return token;
      }
    });

    if (publisherToken.length > 0) {
      return true;
    }

    return false;
  }),

  // Setup the form panes so that the appropriate breadcrumb is created
  currentPaneIndex: alias('formService.currentPaneIndex'),
  // eslint-disable-next-line ember/avoid-leaking-state-in-ember-objects
  formPanes: [
    'venue',
    'start-date-and-time',
    'name-and-external-link',
    'description',
    'image',
    'confirm-and-submit',
  ],

  /*
   *
   * Navigation from the venue form pane is complicated by the various requirements of
   * virtual and physical events.
   *
   * For physical events users search for a venue, place a pin on a map, then confirm the address
   * For virtual events users give a url and then skip the search for venue, place pin and confirm address sections.
   */
  venueNextAction: computed('mapOpen', 'editingAddress', function () {
    if (this.editingAddress === true) {
      return 'validateThenNext';
    } else if (this.mapOpen === true) {
      return 'setEditingAddress';
    } else {
      return 'validateThenNext';
    }
  }),

  /*
   * If the form is showing the editing address or place a pin on a map views back should
   * return to the search page.
   *
   * If the form is on the search venues page back should return to community-events route
   */
  prevFromVenueAction() {
    if (this.editingAddress === true || this.mapOpen === true) {
      return this.send('prevFromVenue');
    } else {
      return this.send('goToRoute', 'community-events');
    }
  },

  /*
   *
   * For physical events validate the venue
   * For virtual events validate the external_link
   *
   */
  venueValidateThenNextAttrs: computed('event.event_format', function () {
    if (this.event.event_format === 'virtual') {
      return 'event.external_link';
    } else {
      return 'venue';
    }
  }),

  /*
   * performVenueSearch()
   *
   * term     The search term for nominatim     string
   *
   * Search the rails database for existing venues and nominatim databases for places which match the string provided.
   *
   */
  performVenueSearch(term, resolve) {
    var queryURL = `${this.apiEndpoint}/venues/search?q=${encodeURIComponent(
      term,
    )}`;
    return fetch(queryURL)
      .then((resp) => resp.json())
      .then((json) => {
        this.set('serverErrors', null);
        this.set('searchVenueResults', json);
        resolve(json);
      })
      .catch((err) => {
        console.log(err);
        this.set('serverErrors', {
          base: ['Network Error, please try again.'],
        });
      });
  },

  /*
   *
   * Uploading images can be skipped, as such the button text and actions are resultant on whether
   * an image has been chosen.
   *
   */
  imageNextButtonText: computed('uncroppedImage', function () {
    if (this.uncroppedImage) {
      return 'Next';
    } else {
      return 'Skip';
    }
  }),
  imageNextAction: computed('uncroppedImage', function () {
    if (this.uncroppedImage) {
      return 'cropAndNext';
    } else {
      return 'next';
    }
  }),

  /*
   * performVenueSearch()
   *
   * term     The search term for nominatim     string
   *
   * Search the rails database for existing venues and nominatim databases for places which match the string provided.
   *
   */
  submitAction: computed('event.event_format', function () {
    var action;
    if (this.event.event_format === 'virtual') {
      action = 'createEvent';
    } else if (this.event.event_format === 'physical') {
      action = 'createVenueThenEvent';
    }
    return action;
  }),

  /*
   *
   * resetForm()
   *
   * re-initialise the form ready for another submission.
   *
   */
  resetForm() {
    this.setProperties({
      event: {
        image_base64: null,
        filename: '', //Blank string filename ensures that the API generates a random filename.
        name: null,
        description: null,
        venue: {},
        start_time: null,
        end_time: null,
        selectedVenue: null,
        external_link: null,
        editingAddress: false,
        mapOpen: false,
        event_format: 'physical',
        event_type: 'community_event',
      },
      image_base64: null,
      formSubmitted: null,
      selectedVenue: null,
      venue: {},
      mapOpen: false,
      uncroppedImage: null,
    });

    this.formService.resetForm();
  },

  actions: {
    /*---------- FORM NAVIGATION ACTIONS ----------*/

    /*
     * registerFormElement
     *
     * Used to register each form pane with the form service.  This allows the form service to manage the navigation between form panes
     * and to set the active element in the breadcrumb.
     *
     * id     The id of the form Pane     String
     */
    registerFormElement(id) {
      this.formService.registerFormElement(id);
    },
    /*
     * next()
     *
     * Proceed to the next form pane
     */
    next() {
      this.formService.next(this);
      this.set('mapOpen', false);
      this.set('editingAddress', false);
      this.set('serverErrors', null);
    },
    /*
     * prev()
     *
     * Go back to the previous form pane
     */
    prev() {
      this.formService.prev();
      this.set('editingAddress', false);
      this.set('serverErrors', null);
    },
    /*
     * goTo(id)
     *
     * id       the id of the form pane to navigate to      string
     *
     * Go back to the previous form pane
     */
    goTo(id) {
      this.formService.goTo(id);
    },
    /*
     * validateThenNext(attrs)
     *
     * attrs       the object that needs to pass validation      EmberObject
     *
     * validate the object passed and, if valid progress to the next form pane
     */
    validateThenNext(attrs) {
      this.formService
        .validateThenNext(attrs.trim().split(','), this)
        .then((errors) => {
          this.set('errors', errors);
        });
    },
    /*
     * cropAndNext()
     *
     * validate the object passed and, if valid progress to the next form pane
     */
    cropAndNext() {
      var image_base64 = this.formService.getCroppedCanvas(this.cropper);
      this.set('event.image_base64', image_base64);
      this.formService.next(this);
    },
    /*
     * prevFromVenue()
     *
     * custom action to deal with navigation around venue page.
     */
    prevFromVenue() {
      if (this.editingAddress === true) {
        this.set('editingAddress', false);
      } else if (this.mapOpen === true) {
        this.set('mapOpen', false);
      } else {
        this.send('prev');
      }
    },

    /*
     * searchVenues()
     *
     * term       search string       string
     *
     * debounced action to search for venue
     */
    searchVenues(term) {
      return new RSVP.Promise((resolve, reject) => {
        debounce(this, this.performVenueSearch, term, resolve, reject, 600);
      });
    },
    /*
     * setSelectedVenue()
     *
     * selectedVenue       venue object that was chosen     object
     *
     * set the chosen venue and associated attributes
     */
    setSelectedVenue(selectedVenue) {
      this.set('venue', selectedVenue);
      this.set('venue.venue_type', 'community_venue');
      this.set('venue.festival_id', this.festival_id);
      this.set('venue.wallet_address', this.model.wallet.address);
      this.set('mapOpen', true);
    },
    /*
     * setVenueLatLon()
     *
     * center     object containing lat and long      object
     *
     * Set the lat and long on the venue.  This is used when a user
     * moves the map pin location for a venue found from the database.
     */
    setVenueLatLon(center) {
      this.set('venue.lat', center.lat);
      this.set('venue.long', center.lng);
      this.set('venue.osm_id', null);
    },
    /*
     * updateEventFormat()
     *
     * eventFormat      The format of this event (virtual or physical)   string
     *
     * Set the event type on the event model
     */
    updateEventFormat(eventFormat) {
      this.set('event.event_format', eventFormat);
      // Set the virtual event attribute to true if the eventFormat is virtual
      this.set('event.virtual_event', eventFormat === 'virtual');
    },
    /*
     * updateEventType()
     *
     * eventType      The type of event this is (virtual or physical)   string
     *
     * Set the event type on the event object
     */
    setEditingAddress() {
      this.set('editingAddress', true);
    },

    /*
     * createEvent()
     *
     * venue      The venue object returned from a successful server request to create the venue   object
     *
     * Create the Event
     */
    createEvent(venue) {
      var self = this;
      this.set('loading', true);

      if (venue) {
        this.event.venue_id = venue.id;
      }
      // Set festival_id
      this.event.festival_id = this.festival_id;

      return $.ajax(this.apiEndpoint + 'events', {
        method: 'POST',
        data: this.event,
      })
        .then(() => {
          this.set('loading', false);
          self.set('formSubmitted', true);
          self.set('serverErrors', null);
        })
        .catch((response) => {
          this.set('loading', false);
          console.log(response);
          self.set('submitButtonText', 'Retry');
          self.set('serverErrors', {
            base: ['Oops, there was a problem, please try again.'],
          });
        });
    },
    /*
     * createVenueThenEvent()
     *
     * Create the Venue then send the action to create the event.
     */
    createVenueThenEvent() {
      var self = this;

      this.set('loading', true);

      // Save venue first
      return $.ajax(this.apiEndpoint + 'venues', {
        method: 'POST',
        data: this.venue,
      })
        .then((response) => {
          self.send('createEvent', response.venue);
        })
        .catch((response) => {
          this.set('loading', false);
          if (response.readyState == 0) {
            self.set('serverErrors', {
              base: ['Network Error, please try again.'],
            });
          } else {
            self.set('serverErrors', response.responseJSON.errors);
          }
        });
    },

    /*
     * resetForm()
     *
     * The action to reset the form when preparing for a resubmission
     */
    resetForm() {
      this.resetForm();
    },

    /*
     * resetVenueSearch()
     *
     * The action to reset the venue search
     */
    resetVenueSearch() {
      this.set('selectedVenue', null);
      this.set('venue', {});
      this.set('mapOpen', false);
    },
  },
});
