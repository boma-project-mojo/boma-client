import Component from '@ember/component';
import ENV from 'boma/config/environment';
import { inject as service } from '@ember/service';

// Get all CSS Variables to apply styling.
let CSSVariables = getComputedStyle(document.documentElement);

// Set self to allow the mapLibre code to access the ember component
var self;

// Enable to test the overlay tiles with vector tiles to verify they line up.
let testOverlayWithVectorTilesEnabled = false;

// Overlay image filename base and extension
let imageFilenameBase = ENV['mapConfig']['imageFilenameBase'];
let imageFilenameExt = ENV['mapConfig']['imageFilenameExt'];

// The four co-ordinates for the extreme four corners of the overlay image.
let xtop = ENV['mapConfig']['xtop'];
let xright = ENV['mapConfig']['xright'];
let xbottom = ENV['mapConfig']['xbottom'];
let xleft = ENV['mapConfig']['xleft'];

// The center of the map
let xcenterlat = xleft + Math.abs(xleft - xright) / 2;
let xcenterlong = xtop - Math.abs(xtop - xbottom) / 2;

// MaxBounds of the map, users can't scroll beyond this
let maxBounds = [
  [xleft - 0.001, xbottom - 0.021],
  [xright + 0.001, xtop + 0.021],
];

// This is the overlay style for the map when the vector tiles are not included
var overlayMapStyle = {
  version: 8,
  name: 'Dark',
  sources: {
    overlay: {
      type: 'image',
      url: `assets/images/${imageFilenameBase}1.${imageFilenameExt}`,
      coordinates: [
        [xleft, xtop],
        [xcenterlat, xtop],
        [xcenterlat, xcenterlong],
        [xleft, xcenterlong],
      ],
    },
    overlay2: {
      type: 'image',
      url: `assets/images/${imageFilenameBase}2.${imageFilenameExt}`,
      coordinates: [
        [xcenterlat, xtop],
        [xright, xtop],
        [xright, xcenterlong],
        [xcenterlat, xcenterlong],
      ],
    },
    overlay3: {
      type: 'image',
      url: `assets/images/${imageFilenameBase}3.${imageFilenameExt}`,
      coordinates: [
        [xleft, xcenterlong],
        [xcenterlat, xcenterlong],
        [xcenterlat, xbottom],
        [xleft, xbottom],
      ],
    },
    overlay4: {
      type: 'image',
      url: `assets/images/${imageFilenameBase}4.${imageFilenameExt}`,
      coordinates: [
        [xcenterlat, xcenterlong],
        [xright, xcenterlong],
        [xright, xbottom],
        [xcenterlat, xbottom],
      ],
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': CSSVariables.getPropertyValue(
          '--map-background-color',
        ),
      },
    },
    {
      id: 'overlay',
      source: 'overlay',
      type: 'raster',
      paint: { 'raster-opacity': 1 },
    },
    {
      id: 'overlay2',
      source: 'overlay2',
      type: 'raster',
      paint: { 'raster-opacity': 1 },
    },
    {
      id: 'overlay3',
      source: 'overlay3',
      type: 'raster',
      paint: { 'raster-opacity': 1 },
    },
    {
      id: 'overlay4',
      source: 'overlay4',
      type: 'raster',
      paint: { 'raster-opacity': 1 },
    },
  ],
};

// When testing overlaid tiles it's sometimes useful to have the vector tiles displayed.  This requires the mapStyles to be loaded
// from the OSM server and the following styles to be added.  This function is called in on('load') when testOverlayWithVectorTilesEnabled is set to true.
//
// map   The map object   (maplibre object)
var testOverlayWithVectorTiles = function (map) {
  map.addSource('overlay1', {
    type: 'image',
    url: `assets/images/${imageFilenameBase}1.${imageFilenameExt}`,
    coordinates: [
      [xleft, xtop],
      [xcenterlat, xtop],
      [xcenterlat, xcenterlong],
      [xleft, xcenterlong],
    ],
  });
  map.addLayer({
    id: 'overlay1',
    source: 'overlay1',
    type: 'raster',
    paint: { 'raster-opacity': 0.5 },
  });

  map.addSource('overlay2', {
    type: 'image',
    url: `assets/images/${imageFilenameBase}2.${imageFilenameExt}`,
    coordinates: [
      [xcenterlat, xtop],
      [xright, xtop],
      [xright, xcenterlong],
      [xcenterlat, xcenterlong],
    ],
  });
  map.addLayer({
    id: 'overlay2',
    source: 'overlay2',
    type: 'raster',
    paint: { 'raster-opacity': 0.5 },
  });

  map.addSource('overlay3', {
    type: 'image',
    url: `assets/images/${imageFilenameBase}3.${imageFilenameExt}`,
    coordinates: [
      [xleft, xcenterlong],
      [xcenterlat, xcenterlong],
      [xcenterlat, xbottom],
      [xleft, xbottom],
    ],
  });
  map.addLayer({
    id: 'overlay3',
    source: 'overlay3',
    type: 'raster',
    paint: { 'raster-opacity': 0.5 },
  });

  map.addSource('overlay4', {
    type: 'image',
    url: `assets/images/${imageFilenameBase}4.${imageFilenameExt}`,
    coordinates: [
      [xcenterlat, xcenterlong],
      [xright, xcenterlong],
      [xright, xbottom],
      [xcenterlat, xbottom],
    ],
  });
  map.addLayer({
    id: 'overlay4',
    source: 'overlay4',
    type: 'raster',
    paint: { 'raster-opacity': 0.5 },
  });
};

// return the bounds for a marker and the current location of a user
//
// markerLat    the latitude of the marker                      int
// markerLong   the longitude of the marker                     int
// latLoc       the latitude of the user's current location     int
// latLong      the longitude of the user's current location    int
var pointsWithinBounds = function (markerLat, markerLong, latLoc, longLoc) {
  let north = Math.max(markerLat, latLoc);
  let south = Math.min(markerLat, latLoc);
  let east = Math.max(markerLong, longLoc);
  let west = Math.min(markerLong, longLoc);

  let factor = 0.1;

  let marginLat = Math.abs(north - south) * factor;
  let marginLong = Math.abs(east - west) * factor;

  return [
    [west - marginLong, south - marginLat],
    [east + marginLong, north + marginLat],
  ];
};

// animate the map to the home location.
var flyHome = function () {
  if (
    window.lastKnownPositionLat !== undefined &&
    window.lastKnownPositionLong !== undefined &&
    window.markerLat !== undefined &&
    window.markerLong !== undefined
  ) {
    return this._map.fitBounds(
      pointsWithinBounds(
        window.markerLat,
        window.markerLong,
        window.lastKnownPositionLat,
        window.lastKnownPositionLong,
      ),
    );
  } else if (
    window.markerLat !== undefined &&
    window.markerLong !== undefined
  ) {
    this._map.fitBounds(
      pointsWithinBounds(
        window.markerLat,
        window.markerLong,
        window.markerLat,
        window.markerLong,
      ),
    );
  } else {
    return this._map.fitBounds([
      [xleft, xbottom],
      [xright, xtop],
    ]);
  }
};

var addMarker = function (map, lat, long, title, pinType) {
  // If the marker relates to a pin that a user can add to the map
  if (pinType) {
    // create the pin element
    let marker = document.createElement('div');
    let controlSprite = marker.appendChild(document.createElement('i'));

    if (pinType === 'car') {
      controlSprite.className = 'car-pin';
    } else if (pinType === 'tent') {
      controlSprite.className = 'tent-pin';
    }

    marker.addEventListener('click', (e) => {
      // Prevent further propagation of the current event so that clicking this doesn't trigger click on the
      // marker click listener below.
      e.stopPropagation();

      // Add a popup so when a user clicks on the marker a button appears to remove the marker
      let btn = document.createElement('div');
      btn.innerHTML = `<button class="btn btn-danger">Remove Marker</button>`;
      btn.addEventListener('click', () => {
        marker.remove();
        popup.remove();
        mapLibreResetPin(pinType, map);
      });

      let popup = new maplibregl.Popup({
        closeOnClick: true,
        className: 'remove-pin',
      })
        .setLngLat([long, lat])
        .setDOMContent(btn)
        .addTo(map);
    });

    new maplibregl.Marker({ element: marker, anchor: 'bottom' })
      .setLngLat([parseFloat(long), parseFloat(lat)])
      .addTo(map);
  } else if (title) {
    // If the marker has a title add a pop over the map
    new maplibregl.Popup({
      closeOnClick: false,
      anchor: 'bottom',
      className: 'map-popup',
    })
      .setLngLat([long, lat])
      .setHTML(`<span>${title}</span>`)
      .addTo(map);

    // Pan and zoom the map to the marker
    map.flyTo({
      center: [parseFloat(long), parseFloat(lat)],
      zoom: 17,
      speed: 4,
    });
  } else {
    // Otherwise just add a simple marker
    new maplibregl.Marker()
      .setLngLat([parseFloat(long), parseFloat(lat)])
      .addTo(map);

    // Pan and zoom the map to the marker
    map.flyTo({
      center: [parseFloat(long), parseFloat(lat)],
      zoom: 17,
      speed: 4,
    });
  }
};

// Class to add a map control
// see https://maplibre.org/maplibre-gl-js-docs/api/markers/#icontrol for full details
// Provide the following variables when instantiating the class
//
// CSSclassNames    the CSS class names that the control element should have      string
// action           the action that should be called when clicking the control    function
class mapControl {
  constructor(controlType, CSSclassNames, action) {
    this.controlType = controlType;
    this.CSSclassNames = CSSclassNames;
    this.action = action;
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = `maplibregl-ctrl maplibregl-ctrl-group ${this.controlType}`;
    this._control = this._container.appendChild(
      document.createElement('button'),
    );
    this._control.addEventListener('click', () => {
      this.action();
    });
    this._control.className = 'maplibregl-ctrl-icon';
    this._controlSprite = this._control.appendChild(
      document.createElement('i'),
    );
    this._controlSprite.className = this.CSSclassNames;
    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

var pinCarControl, pinTentControl;

/*
 * mapLibreAddPin()
 *
 * Get the location of the center of the map (where the user has placed the pin), store it in localstorage
 * add a marker to the map and close the add pin UI.
 */
let mapLibreAddPin = function (map, pinType) {
  // Get the map center (where the user has placed the pin)
  let pinDropLocation = map.getCenter();
  // Store it in localstorage
  localStorage.setItem(`mapPin-${pinType}`, JSON.stringify(pinDropLocation));
  // Close the UI to add a pin
  self.set('showAddPinUI', false);
  // Replace the add ui button with a button to flyTo location
  if (pinType == 'car') {
    map.removeControl(pinCarControl);
    pinCarControl = new mapControl('car', 'car-glyph fly-to', mapLibreFlyToPin);
    map.addControl(pinCarControl, 'top-right');
    // Add a marker to the map in place of the UI
    addMarker(map, pinDropLocation.lat, pinDropLocation.lng, null, 'car');
  } else {
    map.removeControl(pinTentControl);
    pinTentControl = new mapControl(
      'tent',
      'tent-glyph fly-to',
      mapLibreFlyToPin,
    );
    map.addControl(pinTentControl, 'top-right');
    // Add a marker to the map in place of the UI
    addMarker(map, pinDropLocation.lat, pinDropLocation.lng, null, 'tent');
  }
};

/*
 * mapLibreFlyToPin()
 *
 * Pan and zoom the map to the pin location
 */
let mapLibreFlyToPin = function () {
  let pinLocation = JSON.parse(
    localStorage.getItem(`mapPin-${this.controlType}`),
  );

  this._map.flyTo({
    bearing: 0,
    center: [parseFloat(pinLocation.lng), parseFloat(pinLocation.lat)],
    zoom: 15,
    speed: 1.5,
  });
};

/*
 * mapLibreResetPin()
 *
 * Remove the pin for the pinType and reset the controls
 */
let mapLibreResetPin = function (pinType, map) {
  localStorage.removeItem(`mapPin-${pinType}`);

  // Replace the add flyTo button with a button to add pin
  if (pinType == 'car') {
    map.removeControl(pinCarControl);
    pinCarControl = new mapControl('car', 'car-glyph set-pin', self.addPin);
    map.addControl(pinCarControl, 'top-right');
  } else {
    map.removeControl(pinTentControl);
    pinTentControl = new mapControl('tent', 'tent-glyph set-pin', self.addPin);
    map.addControl(pinTentControl, 'top-right');
  }
};

export default Component.extend({
  logger: service(),
  venue: false,
  didGeoLocate: false,
  showAddPinUI: false,
  flash: service(),
  didInsertElement() {
    this._super(...arguments);

    self = this;

    // If testOverlayWithVectorTilesEnabled or showMapTiles is set to true use the
    // open street maps vector tiles.  Otherwise use the overlay map styles defined above.
    var mapStyle;
    if (
      testOverlayWithVectorTilesEnabled === true ||
      this.showMapTiles === 'true'
    ) {
      mapStyle = ENV['mapConfig']['vectorMapTilesStyleURL'];
    } else {
      mapStyle = overlayMapStyle;
    }

    // Initialise the map
    var map = new maplibregl.Map({
      container: 'map',
      maxZoom: 17,
      zoom: 15,
      minZoom: 5,
      center: [xcenterlat, xcenterlong],
      style: mapStyle,
      attributionControl: false,
      maxBounds: this.showMapTiles === 'true' ? false : maxBounds,
    });

    // Add geolocate control to the map.
    var geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      showUserHeading: true,
      trackUserLocation: true,
    });
    map.addControl(geolocate, 'top-left');

    // Fired each time a new location is found from the device's location services.
    geolocate.on('geolocate', (ev) => {
      // Set the location lat and long variables and add them to the global scope
      let longLoc = ev.coords.longitude;
      let latLoc = ev.coords.latitude;
      window.lastKnownPositionLong = longLoc;
      window.lastKnownPositionLat = latLoc;

      // If this is the first time this user's location has been reported then
      // zoom and pan the map to fit the user location and (if provided) the marker.
      if (this.didGeoLocate === false) {
        this.set('didGeoLocate', true);
        if (markerLat !== undefined && markerLong !== undefined) {
          map.fitBounds(
            pointsWithinBounds(markerLat, markerLong, latLoc, longLoc),
          );
        } else {
          map.flyTo({
            bearing: 0,
            center: [parseFloat(longLoc), parseFloat(latLoc)],
            zoom: 16,
          });
        }
      } else {
        return false;
      }
    });

    geolocate.on('outofmaxbounds', function (e) {
      // Show a flash message to alert the user that they are currently outside of the bounds of the map
      self.flash.showFlash('Sorry, you are out of bounds.', 'map_error', 2500);
      // Trigger the control so that it doesn't spin red forever.
      e.target.trigger();
    });

    // If there's a venue or marker lat and long defined in the url query params add a marker to the map
    var markerLat, markerLong;
    if (this.model.venue) {
      markerLat = parseFloat(this.model.venue.get('lat'));
      markerLong = parseFloat(this.model.venue.get('long'));
      addMarker(map, markerLat, markerLong, this.mlabel);
    } else if (this.mlat && this.mlong) {
      markerLat = parseFloat(this.mlat);
      markerLong = parseFloat(this.mlong);
      addMarker(map, this.mlat, this.mlong, this.mlabel);
    }

    // add marketLat and long to the global object so that it can be accessed in the add control method
    // not ideal but can't pass variable through 'add control' as far as i can see
    window.markerLat = markerLat;
    window.markerLong = markerLong;

    // If there's a car  location defined add a marker to the map and add a control
    // that allows users to pan/zoom the map camera to the pin.
    if (this.model.carLoc) {
      addMarker(map, this.model.carLoc.lat, this.model.carLoc.lng, null, 'car');

      // Add locate car pin button control
      pinCarControl = new mapControl(
        'car',
        'car-glyph fly-to',
        mapLibreFlyToPin,
      );
      map.addControl(pinCarControl, 'top-right');
    } else {
      // Add pin car button control
      pinCarControl = new mapControl('car', 'car-glyph set-pin', this.addPin);
      map.addControl(pinCarControl, 'top-right');
    }

    // If there's a tent location defined add a marker to the map and add a control
    // that allows users to pan/zoom the map camera to the pin.
    if (this.model.tentLoc) {
      addMarker(
        map,
        this.model.tentLoc.lat,
        this.model.tentLoc.lng,
        null,
        'tent',
      );

      // Add location tent pin button
      pinTentControl = new mapControl(
        'tent',
        'tent-glyph fly-to',
        mapLibreFlyToPin,
      );
      map.addControl(pinTentControl, 'top-right');
    } else {
      // Add pin tent button
      pinTentControl = new mapControl(
        'tent',
        'tent-glyph set-pin',
        this.addPin,
      );
      map.addControl(pinTentControl, 'top-right');
    }

    // Add the 'home' button.
    map.addControl(
      new mapControl('hone', 'fa fa-light fa-home fa-house', flyHome),
      'top-left',
    );

    map.on('load', () => {
      let mapElement = document.getElementById('map');
      mapElement.classList.add('in');

      // if testOverlayWithVectorTilesEnabled is enabled then add the test overlay vector tiles.
      if (testOverlayWithVectorTilesEnabled === true)
        testOverlayWithVectorTiles(map);

      // If a marker has been set then animate the map to center on the marker.
      if (markerLat !== undefined && markerLong !== undefined) {
        map.flyTo({
          bearing: 0,
          center: [parseFloat(markerLong), parseFloat(markerLat)],
          zoom: 15,
          speed: 1.5,
        });
      }
    });

    // Used for when adding map pointers to venues.
    if (ENV['environment'] === 'development') {
      map.on('click', (e) => {
        console.log(`${e.lngLat.lat} ${e.lngLat.lng}`);
        navigator.clipboard.writeText(`${e.lngLat.lat} ${e.lngLat.lng}`);
      });
    }

    // Store the map on this object.
    this.set('map', map);
  },
  willDestroyElement: function () {
    this._super(...arguments);
    if (this.map !== null) {
      this.map.remove();
    }
  },
  addPin: function () {
    self.set('activePinType', this.controlType);
    self.set('showAddPinUI', true);
  },
  actions: {
    placePin: function () {
      mapLibreAddPin(this.map, this.activePinType, this);
    },
    cancelPlacePin: function () {
      self.set('showAddPinUI', false);
    },
  },
});
