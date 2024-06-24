import DS from 'ember-data';

export default DS.Model.extend({
  rev: DS.attr('string'),
  preferable_type: DS.attr('string'),
  preferable_id: DS.attr('number'),
  event_id: DS.attr(),
  article_id: DS.attr(),
  venue_id: DS.attr(),
});
