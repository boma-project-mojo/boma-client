import Service from '@ember/service';
import { versionRegExp } from 'ember-cli-app-version/utils/regexp';
import config from '../config/environment';
import { computed } from '@ember/object';

export default Service.extend({
  // The major, minor, patch app version (minus the commit hash)
  appVersion: config.APP.version.match(versionRegExp)[0],
  // The major number from the app version
  majorAppVersion: config.APP.version.match(versionRegExp)[0].split('.')[0],

  // Check that the app is running in the cordova environment
  isCordova: computed(function () {
    return window.cordova !== undefined;
  }),
});
