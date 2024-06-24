import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  store: service(),
  queryParams: {
    venueID: {
      // refreshModel: true
    },
    productionID: {},
    mlat: {},
    mlong: {},
    showBack: {},
    showMapTiles: {},
  },
  async model(params) {
    let model = {};

    // If venue id is specified then get the venue so a map pin can be placed.
    if (params['venueID']) {
      let venue = await this.store.findRecord('venue', params['venueID']);
      model['venue'] = venue;
    }

    // Get the location set for the car map pin if set
    let carLoc = JSON.parse(localStorage.getItem('mapPin-car'));
    // Get the location set for the tent map pin if set
    let tentLoc = JSON.parse(localStorage.getItem('mapPin-tent'));

    if (carLoc) model['carLoc'] = carLoc;
    if (tentLoc) model['tentLoc'] = tentLoc;

    return model;
  },
  setupController(controller, model) {
    controller.set('headerShown', true);
    this._super(controller, model);
  },
  resetController(controller, isExiting) {
    if (isExiting) {
      // isExiting would be false if only the route's model was changing
      controller.set('productionID', null);
      controller.set('venueID', null);
      controller.set('mlat', null);
      controller.set('mlong', null);
      controller.set('model', null);
      controller.set('showMapTiles', null);
    }
  },
});
