// https://github.com/emberjs/ember.js/issues/14174

import Mixin from '@ember/object/mixin';
import { typeOf } from '@ember/utils';

function basicArray(array) {
  if (typeOf(array) !== 'array') {
    return false;
  }

  return array.every((value) => {
    return ['string', 'number'].includes(typeOf(value));
  });
}

export default Mixin.create({
  serializeQueryParam(value, urlKey, defaultValueType) {
    if (defaultValueType === 'array' && basicArray(value)) {
      return value.slice();
    }

    return this._super(value, urlKey, defaultValueType);
  },
  deserializeQueryParam(value, urlKey, defaultValueType) {
    if (defaultValueType === 'array' && basicArray(value)) {
      return value.slice();
    }

    return this._super(value, urlKey, defaultValueType);
  },
});
