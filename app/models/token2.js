import DS from 'ember-data';
import { computed } from '@ember/object';

export default DS.Model.extend({
  server_id: DS.attr(),
  // tokentype: DS.belongsTo("tokentype", {async: true}),
  address: DS.attr('string'),
  validated: DS.attr('boolean'),
  mining: DS.attr('boolean'),
  event_id: DS.attr(),
  event_name: DS.attr(),
  event_image_base64: DS.attr(),
  event_start_date: DS.attr(),
  event_end_date: DS.attr(),
  event_center_lat: DS.attr(),
  event_center_long: DS.attr(),
  event_location_radius: DS.attr(),
  aasm_state: DS.attr(),
  concat_lat_long: computed(
    'event_center_lat',
    'event_center_long',
    'event_location_radius',
    function () {
      var concat_lat_long;
      if (this.event_center_lat) {
        concat_lat_long =
          this.event_center_lat.substring(0, 8) +
          '..., ' +
          this.event_center_long.substring(0, 8) +
          '∅' +
          this.event_location_radius;
      }
      return concat_lat_long;
    },
  ),
  tokentype_id: DS.attr(),
  token_state: computed(
    'aasm_state',
    'token.{event_start_time,event_end_time}',
    function () {
      var state;
      var token = this;
      var aasm_state = token.get('aasm_state');
      var now = moment();
      if (aasm_state === 'initialised') {
        if (now.diff(moment(token.get('event_start_date'))) < 0) {
          state = 'waiting';
        }
        if (now.diff(moment(token.get('event_end_date'))) > 0) {
          state = 'closed';
        }
        if (
          now.diff(moment(token.get('event_start_date'))) > 0 &&
          now.diff(moment(token.get('event_end_date'))) < 0
        ) {
          state = 'ready';
        }
      } else {
        state = aasm_state;
      }

      return state;
    },
  ),
  last_updated_at: DS.attr(),
});
