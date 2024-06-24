import Component from '@ember/component';
import { gt } from '@ember/object/computed';

export default Component.extend({
  tagName: '',
  long: gt('title.length', 10),
});
