import DS from 'ember-data';

export default DS.Model.extend({
  rev: DS.attr('string'),
  name: DS.attr(),
  festival_id: DS.attr(),
  event_start_time: DS.attr(),
  event_end_time: DS.attr(),
  event_center_lat: DS.attr(),
  event_center_long: DS.attr(),
  event_radius: DS.attr(),
  contract_address: DS.attr(),
  is_public: DS.attr(),
  image_base64: DS.attr(),
});
