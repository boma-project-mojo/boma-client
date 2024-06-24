'use strict';

module.exports = {
  root: true,
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      plugins: [
        ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
      ],
    },
  },
  plugins: ['ember'],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    browser: true,
  },
  rules: {
    // Remove all of the following when upgrading to octane
    'ember/no-classic-components': 'off',
    'ember/no-classic-classes': 'off',
    'ember/no-actions-hash': 'off',
    'ember/no-mixins': 'off',
    'ember/no-new-mixins': 'off',
    'ember/no-jquery': 'off',
    'ember/no-global-jquery': 'off',
    'ember/require-tagless-components': 'off',
    'ember/no-component-lifecycle-hooks': 'off',
    'ember/use-ember-data-rfc-395-imports': 'off',
  },
  globals: {
    moment: true,
    cordova: true,
    ImgCache: true,
    $: true,
    Konva: true,
    maplibregl: true,
    Cropper: true,
    fabric: true,
    FontFaceObserver: true,
    SafariViewController: true,
    device: true,
    MusicControls: true,
    Flickity: true,
    PushNotification: true,
    ethers: true,
    Slideout: true,
    Camera: true,
    Media: true,
    DOMPurify: true,
  },
  overrides: [
    // node files
    {
      files: [
        './.eslintrc.js',
        './.prettierrc.js',
        './.stylelintrc.js',
        './.template-lintrc.js',
        './ember-cli-build.js',
        './testem.js',
        './blueprints/*/index.js',
        './config/**/*.js',
        './lib/*/index.js',
        './server/**/*.js',
      ],
      parserOptions: {
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
      extends: ['plugin:n/recommended'],
      rules: {
        // this can be removed once the following is fixed
        // https://github.com/mysticatea/eslint-plugin-node/issues/77
        'node/no-unpublished-require': 'off',
      },
      globals: {
        moment: true,
        Konva: true,
      },
    },
    {
      // test files
      files: ['tests/**/*-test.{js,ts}'],
      extends: ['plugin:qunit/recommended'],
    },
  ],
};
