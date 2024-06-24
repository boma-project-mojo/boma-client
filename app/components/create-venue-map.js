/*
 *
 * Create Venue Map Component
 *
 * This component handles the placing of a pin on the map to allow the user to check the lat/long of a venue.
 * They can also re place the map pin to update the lat/long of the venue location.
 *
 */

import Component from '@ember/component';
import RSVP from 'rsvp';
import { debounce } from '@ember/runloop';
import config from 'boma/config/environment';
import $ from 'jquery';

export default Component.extend({
  // Loading states
  mapLoaded: false,

  // initialise the map on didInsertElement
  didInsertElement() {
    this._super(...arguments);

    var self = this;

    // Set the page scroll to be the top
    window.scrollTo(0, 0);

    // Initialise the map using the vectorMapTilesStyleURL style config
    var map = new maplibregl.Map({
      container: 'community-events-map',
      style: config.mapConfig.vectorMapTilesStyleURL,
      maxZoom: 17,
      zoom: 5,
      center: [-1.02461, 52.307892], //Zoom out from Kelmarsh to the pointer
    });

    // When the map is loaded set mapLoaded to true
    map.on('data', function () {
      if (map.isStyleLoaded()) {
        self.set('mapLoaded', true);
      }
    });

    // Set venue lat long using map pointer
    map.on('moveend', function () {
      self.getLatLon(map.getCenter());
    });
    map.on('touchend', function () {
      self.getLatLon(map.getCenter());
    });

    // If there is a selectedVenue pan and zoom the map to it's lat/long
    if (this.selectedVenue) {
      map.flyTo({
        zoom: 14,
        center: [this.selectedVenue.lon, this.selectedVenue.lat],
      });
    }

    // Store the map on the component object for future use
    this.set('map', map);
  },
  didRender() {
    this._super(...arguments);
    $('input, textarea').unbind();
    // Temporary solution to the iOS keyboard issue (viewport not updated after removing keyboard
    $('input, textarea').on('blur touchleave touchcancel', function () {
      window.scrollTo(0, 0);
    });
  },
  // Destroy the map when removing the component
  willDestroyElement: function () {
    this._super(...arguments);
    if (this.map !== null) {
      this.map.remove();
    }
  },

  /*
   * getLatLon()
   *
   * center   The center of the map       MapLibre centre object
   *
   * debounced by 1000ms get the lat long of the centre of the map when the camera has been panned or zoomed
   */
  getLatLon(center) {
    return new RSVP.Promise((resolve, reject) => {
      debounce(this, this.performGetLatLong, center, resolve, reject, 1000);
    });
  },

  /*
   * performGetLatLong()
   *
   * center   The center of the map       MapLibre centre object
   *
   * send the action to set the venue lat long to the location the pointer has been moved to.
   */
  performGetLatLong(center) {
    this.setVenueLatLon(center);
  },
});
