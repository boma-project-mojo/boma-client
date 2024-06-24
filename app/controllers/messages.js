import Controller, { inject as controller } from '@ember/controller';
import IsDataLoading from '../mixins/is-data-loading';

export default Controller.extend(IsDataLoading, {
  applicationController: controller('application'),

  queryParams: ['notification_id'],

  isLoadingMessages: false,
  secondsTillBackoffRetry: false,

  actions: {
    /* 
     * retryNow()
     *
     * Retry syncing messages with the server JSON blob by reloading the routes model.  
     */
    retryNow() {
      this.send('reloadModel', true);
    },
  },
});
