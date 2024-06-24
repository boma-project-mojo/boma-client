import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: '',
  store: service('store'),
  didReceiveAttrs() {
    this._super(...arguments);

    // Get the ember data tag record
    let tag = this.store.peekRecord('tag', this.tag_id);
    this.set('tag', tag);
  },
  /* 
   * routeName
   * 
   * Used to create a link for this tag to the filtered events list
   */
  routeName: computed('tag.tag_type', function () {
    var routeName;
    if (this.tag.tag_type === 'event') {
      routeName = 'events';
    }
    return routeName;
  }),
  /* 
   * tagIdAsArray
   * 
   * Return this tag as an array, this is passed as a queryParam to the link to the events
   * route where relevant.  
   */
  tagIdAsArray: computed('tag.id', function () {
    return [this.tag.id];
  }),
});
