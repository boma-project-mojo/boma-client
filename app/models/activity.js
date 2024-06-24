import DS from 'ember-data';

export default DS.Model.extend({
  activities: DS.attr(),
  festival_id: DS.attr(),
});
