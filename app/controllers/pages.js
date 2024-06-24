import Controller, { inject as controller } from '@ember/controller';
import IsDataLoading from '../mixins/is-data-loading';

export default Controller.extend(IsDataLoading, {
  applicationController: controller('application'),
  pageModal: false,
  pageModalModel: null,
  actions: {
    /* 
     * openPageModal()
     *
     * Open the page modal
     */
    openPageModal: function (pageID) {
      this.set('pageModal', true);
      this.set('pageModalModelID', pageID);
    },
    /* 
     * closePageModal()
     *
     * Close the page modal
     */
    closePageModal: function () {
      this.set('pageModal', false);
      this.set('pageModalModel', null);
      this.set('pageModalModelID', null);
    },
  },
});
