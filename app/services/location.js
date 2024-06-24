/* 
 * Location Service
 *
 * This service handles all aspects of interacting with the devices location services.  
 * 
 * It also includes functions to calculate whether a given location is within a specified geofence.  
 */
import { Promise } from 'rsvp';

import Service from '@ember/service';

export default Service.extend({
  /* 
   * Get the devices current location using location services.  
   */
  getLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        {
          maximumAge: 5000,
          enableHighAccuracy: true,
        },
      );
    });
  },

  /* 
   * Get the devices accurate currect location using location services.  
   */
  getAccurateCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getAccurateCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        {
          desiredAccuracy: 200,
          maxWait: 15000,
        },
      );
    });
  },

  /* 
   * Check whether the provided center is within the specified radius (size) of the location
   *
   * @center        array['lat', 'long]       The lat long of the location you want to check is in the geofence
   * @location      array['lat', 'long]       The center of the geofence
   * @size          int                       The size of the radius in miles
   */
  withinGeofence(center, location, size) {
    var selected = false;
    var distanceBetween = this.calculateDistanceBetweenPoints(
      center[0],
      center[1],
      location[0],
      location[1],
    );
    if (distanceBetween <= size) {
      selected = true;
    }
    return selected;
  },

  /* 
   * Calculates the distance between two lat and longs
   * 
   * lat1       latitude      the first lat
   * long1      longitude     the first long
   * lat2       latitude      the second lat
   * long2      longitude     the second long
   */
  calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
    // https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a =
      0.5 -
      c((lat2 - lat1) * p) / 2 +
      (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

    var km = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
    var miles = km * 0.6237;

    return miles;
  },
});

/* 
 * See https://stackoverflow.com/questions/40041874/how-do-i-make-navigator-geolocation-timeout-timer-start-after-the-user-has-autho
 */
navigator.geolocation.getAccurateCurrentPosition = function (
  geolocationSuccess,
  geolocationError,
  geoprogress,
  options,
) {
  var lastCheckedPosition, watchID, timerID;

  options = options || {};

  var checkLocation = function (position) {
    lastCheckedPosition = position;
    // We ignore the first event unless it's the only one received because some devices seem to send a cached
    // location even when maximumAge is set to zero.
    //
    // If location isn't accurate enough it will retry.
    if (position.coords.accuracy <= options.desiredAccuracy) {
      clearTimeout(timerID);
      navigator.geolocation.clearWatch(watchID);
      foundPosition(position);
    }
  };

  var abandonTrying = function () {
    navigator.geolocation.clearWatch(watchID);
    geolocationError('location-inaccurate');
  };

  var onError = function (error) {
    clearTimeout(timerID);
    navigator.geolocation.clearWatch(watchID);
    geolocationError(error);
  };

  var foundPosition = function (position) {
    geolocationSuccess(position);
  };

  if (!options.maxWait) options.maxWait = 10000; // Default 10 seconds
  if (!options.desiredAccuracy) options.desiredAccuracy = 200; // Default 20 meters
  if (!options.timeout) options.timeout = options.maxWait; // Default to maxWait

  options.enableHighAccuracy = true;

  options.maximumAge = 0; // Force current locations only
  options.enableHighAccuracy = true; // Force high accuracy (otherwise, why are you using this function?)

  watchID = navigator.geolocation.watchPosition(
    checkLocation,
    onError,
    options,
  );
  timerID = setTimeout(abandonTrying, options.maxWait); // Set a timeout that will abandon the location loop
};
