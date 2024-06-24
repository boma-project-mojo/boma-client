import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import handleDataRefresh from '../mixins/handle-data-refresh';
import { later, cancel } from '@ember/runloop';

export default Route.extend(handleDataRefresh, {
  notificationsService: service('notifications'),
  headerService: service('header'),
  tokenService: service('token'),
  pouchDb: service('pouchDb'),
  router: service(),
  store: service(),
  currentFestivalID: alias('pouchDb.currentFestivalID'),
  backOff: 5000,
  refreshDataRetryTimeout: null,
  queryParams: {
    notification_id: {
      refreshModel: true,
    },
  },
  init() {
    this._super(...arguments);
    // When leaving this route...
    this.router.on('routeWillChange', (transition) => {
      // clear the interval that updates the messages if network is poor if leaving the route
      if (
        transition.from != undefined &&
        transition.from.name != transition.to.name
      ) {
        cancel(this.refreshDataRetryTimeout);
      }
    });
  },
  async model() {
    let allNotifications = await this.store.findAll('notification');

    let currentFestivalIDasInt = parseInt(this.currentFestivalID);

    let publishedNotifications = allNotifications.filter((n) => {
      var diff = moment(n.sent_at).diff(moment(), 'seconds');
      var currentFestival = parseInt(n.festival_id) === currentFestivalIDasInt;
      if (diff < 0 && currentFestival === true) return n;
    });

    return publishedNotifications.sortBy('sent_at').reverse();
  },

  /* 
   * refreshData()
   *
   * Fired on 'activate' by the `handleDataRefresh` mixin the function 
   * syncs local notifications with those stored in the JSON document served on s3.  
   * 
   * This is a fail safe to ensure that the notifications held in local storage 
   * are in sync with those sent even if the push notifications don't arrive.  
   */
  refreshData() {
    var self = this;
    var refreshDataRetryTimeout;
    // Start loading spinner
    self.controllerFor('messages').set('isLoadingModel', true);
    // Start sync
    // If successful
      // Show success and reset
    // If unsuccessful
      // Set a timeout to try again with backoff
    return this.notificationsService
      .syncRemoteNotificationJSON(this.currentFestivalID)
      .then(() => {
        refreshDataRetryTimeout = later(() => {
          self.controllerFor('messages').set('isLoadingModel', false);
          self.controllerFor('messages').set('successReloadingModel', true);
          self.controllerFor('messages').set('secondsTillBackoffRetry', false);
          later(() => {
            self.refresh();
            self.controllerFor('messages').set('successReloadingModel', false);
          }, 1000);
        }, 1000);
        self.set('refreshDataRetryTimeout', refreshDataRetryTimeout);
      })
      .catch(() => {
        refreshDataRetryTimeout = later(() => {
          self.controllerFor('messages').set('isLoadingModel', false);
          self.controllerFor('messages').set('failedReloadingModel', true);
          later(() => {
            self.refresh();
            self.controllerFor('messages').set('failedReloadingModel', false);
          }, 1000);

          const backOff = self.get('backOff');

          later(function () {
            self.refreshData();
          }, backOff);

          self
            .controllerFor('messages')
            .set('secondsTillBackoffRetry', Math.round((backOff * 2) / 1000));

          self.set('backOff', backOff * 2);
        }, 1000);
        self.set('refreshDataRetryTimeout', refreshDataRetryTimeout);
      });
  },
  setupController(controller, model) {
    var self = this;

    this.headerService.showHeader();

    this._super(controller, model);
  },
  resetController(controller, isExiting, transition) {
    controller.set('messages', null);
    if (isExiting && transition.targetName !== 'error') {
      controller.set('notification_id', null);
    }
  },
  actions: {
    refreshModel: function () {
      this.refresh();
    },
  },
});
