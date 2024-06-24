import DS from 'ember-data';

export default DS.Model.extend({
  rev: DS.attr(),
  name: DS.attr(),
  tag_type: DS.attr(),
  // production: DS.belongsTo('production',{dontsave: true, async: true}),
  aasm_state: DS.attr(),
  description: DS.attr(),
  festival_id: DS.attr(),
});
