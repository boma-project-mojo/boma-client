import Component from '@ember/component';
import ListImageLoadingMixin from '../mixins/list-image-loading';
import { computed } from '@ember/object';

export default Component.extend(ListImageLoadingMixin, {
  tagName: '',
  /* 
   * appStoreLink
   *
   * Format the URLs for the app update nag
   */
  appStoreLink: computed('appleAppId', 'bundleId', function () {
    var appStoreLink;
    if (window.cordova) {
      if (device.platform === 'iOS') {
        if (this.appleAppId) {
          appStoreLink = `https://apps.apple.com/tc/app/${this.appleAppId}`;
        }
      } else if (device.platform === 'Android') {
        if (this.bundleId) {
          appStoreLink = `http://play.google.com/store/apps/details?id=${this.bundleId}`;
        }
      }
    }
    return appStoreLink;
  }),
  actions: {
    hideUpdateNag() {
      this.set('showUpdateNag', false);
    },
  },
});
