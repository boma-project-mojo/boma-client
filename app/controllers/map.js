import Controller, { inject as controller } from '@ember/controller';

export default Controller.extend({
  applicationController: controller('application'),

  queryParams: [
    'venueID',
    'productionID',
    'mlat',
    'mlong',
    'showBack',
    'mlabel',
    'showMapTiles',
  ],
  productionID: null,
  venueID: null,
  mlat: 0,
  mlong: 0,
  actions: {
    /* 
     * back()
     *
     * Navigate back to the previous route. 
     */
    back() {
      window.history.back();
    },
  },
});
