'use strict';

var webpack = require('webpack');

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    // Add options here
    SRI: { enabled: false },
    fingerprint: {
      enabled: false,
      exclude: ['images'],
    },
    funnel: {
      exclude: [`corber/**`],
    },
    minifyCSS: {
      enabled: false,
    },
    minifyJS: {
      enabled: false,
    },
    autoImport: {
      publicAssetURL: './assets', //required for inserted paths created by ember-auto-import to be compatible with cordova
      webpack: {
        resolve: {
          fallback: {
            // make sure you `npm install path-browserify` to use this
            path: require.resolve('path-browserify'),
          },
          alias: {
            process: 'process/browser',
          },
        },
        plugins: [
          new webpack.ProvidePlugin({
            // Make a global `process` variable that points to the `process` package,
            // because the `util` package expects there to be a global variable named `process`.
            // Thanks to https://stackoverflow.com/a/65018686/14239942
            process: 'process/browser',
          }),
          new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
          }),
        ],
      },
    },
    'ember-cli-terser': {
      enabled: false,
    },
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  app.import('node_modules/maplibre-gl/dist/maplibre-gl.css');
  app.import('node_modules/maplibre-gl/dist/maplibre-gl.js');

  app.import('node_modules/slideout/dist/slideout.min.js');

  app.import('node_modules/@chrisben/imgcache.js/lib/imgcache.js');

  app.import('node_modules/imagesloaded/imagesloaded.pkgd.js');

  app.import('node_modules/cropperjs/dist/cropper.min.js');
  app.import('node_modules/cropperjs/dist/cropper.min.css');

  app.import('node_modules/flickity/dist/flickity.min.css');
  app.import('node_modules/flickity/dist/flickity.pkgd.min.js');

  // app.import('node_modules/lunr/lunr.min.js');

  app.import('node_modules/fabric/dist/fabric.min.js');
  app.import('node_modules/fontfaceobserver/fontfaceobserver.js');

  app.import('node_modules/ethers/dist/ethers.umd.js');

  // app.import('node_modules/video.js/dist/video-js.min.css');
  // app.import('node_modules/video.js/dist/video.min.js');

  app.import('node_modules/konva/konva.min.js');

  app.import('node_modules/dompurify/dist/purify.min.js');

  return app.toTree();
};
