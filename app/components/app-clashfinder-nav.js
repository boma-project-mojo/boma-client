import Component from '@ember/component';
import { gt } from '@ember/object/computed';

export default Component.extend({
  tagName: '',
  longFestival: gt('days.length', 7),
});
