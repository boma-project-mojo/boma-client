import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: '',
  /* 
   * safeString
   *
   * Return a sanitised safeString for the string provided.  
   */
  safeString: computed('string', function () {
    return DOMPurify.sanitize(this.string, { ADD_TAGS: ["iframe"], ADD_ATTR: ['target', 'style', 'frameborder'] });
  }),
});
