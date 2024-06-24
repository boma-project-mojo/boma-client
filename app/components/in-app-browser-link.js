import Component from '@ember/component';

export default Component.extend({
  tagName: '',
  actions: {
    /* 
     * openLinkInInAppBrowser()
     *
     * Open a link using the in app browser or Safari in app web 
     * browser
     * 
     * url      fqurl     The URL to open 
     */
    openLinkInInAppBrowser(url) {
      // if cordova
        // If iOS (and SafariViewController is available)
          // Use safari to display links because it looks bette
        // else
          // Use cordova inappbrowser to display links
      // else
        // open the URL in a new tab of the browser
      if (window.cordova !== undefined) {
        SafariViewController.isAvailable(function (available) {
          if (available) {
            SafariViewController.show({
              url: url,
              hidden: false, // default false. You can use this to load cookies etc in the background (see issue #1 for details).
              animated: false, // default true, note that 'hide' will reuse this preference (the 'Done' button will always animate though)
              transition: 'curl', // (this only works in iOS 9.1/9.2 and lower) unless animated is false you can choose from: curl, flip, fade, slide (default)
              enterReaderModeIfAvailable: false, // default false
            });
          } else {
            // potentially powered by InAppBrowser because that (currently) clobbers window.open
            // window.open(url, '_blank', 'location=yes');
            cordova.InAppBrowser.open(
              url,
              '_blank',
              'location=yes,toolbarcolor=#000000,hidenavigationbuttons=true,closebuttoncolor=#ffffff',
            );
          }
        });
      } else {
        window.open(url, '_blank');
      }
    },
  },
});
