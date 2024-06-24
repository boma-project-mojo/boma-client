import ENV from '../config/environment';

export function initialize(application) {
  if (window.cordova) {
    // Hold up local notification events until the ember app is ready to handle them.
    window.skipLocalNotificationReady = true;
    // Tell ember to wait until all synchronous code has been completed.  
    application.deferReadiness();

    document.addEventListener(
      'deviceready',
      function () {
        // Show the status bar on the following iOS devices with notches.
        let showStatusOn = [
          'iPhone10,3',
          'iPhone10,6',
          'iPhone11,8',
          'iPhone11,2',
          'iPhone11,6',
          'iPhone12,1',
          'iPhone12,3',
          'iPhone12,5',
          'iPhone13,1',
          'iPhone13,2',
          'iPhone13,3',
          'iPhone13,4',
          'iPhone14,4',
          'iPhone14,5',
          'iPhone14,2',
          'iPhone14,3',
        ];

        // If the curent device model is included in the showStatusOn devices
        // or if the device platform is Android
          // show the status bar
        // otherwise
          // hide it
        if (
          device &&
          (showStatusOn.includes(device.model) || device.platform === 'Android')
        ) {
          window.StatusBar.show();
        } else {
          window.StatusBar.hide();
        }

        // Initialise the ImgCache plugin to set the file system root
        ImgCache.init(() => {
          ImgCache.options.cordovaFilesystemRoot = cordova.file.dataDirectory;
          application.advanceReadiness();
        });

        // Handle direct URLs to the app which is currently only used to
        // allow users to click on a link to claim and mine a token.  
        window.handleOpenURL = function (destinationURL) {
          var url = new URL(destinationURL);
          var params = new URLSearchParams(url.search);
          window.handleOpenURLParams = params;
          var router = application.__container__.lookup('router:main');
          if (
            window.handleOpenURLParams &&
            window.handleOpenURLParams.get('claimTokenNonce')
          ) {
            router.transitionTo('redeem-token', {
              queryParams: {
                claimTokenNonce:
                  window.handleOpenURLParams.get('claimTokenNonce'),
              },
            });
          }
        };

        // When the app is put into the background set the appLastClosedAt 
        // variable to be the current time.  
        document.addEventListener(
          'pause',
          function () {
            window.appLastClosedAt = Date.now();
          },
          false,
        );
      },
      false,
    );
  } else if (ENV.environment == 'development') {
    // Initialise ImgCache for the browser version of the app.
    application.deferReadiness();
    ImgCache.init(() => {
      ImgCache.options.debug = false;
      ImgCache.options.chromeQuota = 50 * 1024 * 1024 * 10000000;
      application.advanceReadiness();
    });
  }
}

export default {
  name: 'cordova',
  initialize: initialize,
};
