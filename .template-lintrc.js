'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    'link-href-attributes': 'off',
    'table-groups': 'off',
    'simple-unless': 'off',
    'no-heading-inside-button': 'off',
    'no-nested-interactive': 'off',
    'require-presentational-children': 'off',
    'require-media-caption': 'off',
    // Remove when upgrading to octane
    'no-action': 'off',
  },
};
