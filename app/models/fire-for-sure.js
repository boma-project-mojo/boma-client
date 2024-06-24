import DS from 'ember-data';

export default DS.Model.extend({
  url: DS.attr('string'),
  postData: DS.attr(),
  attempts: DS.attr(),
  lastTried: DS.attr('date'),
  sentAt: DS.attr('date'),
  requestErrors: DS.attr(),
  requestStatus: DS.attr(),
  relatedModelName: DS.attr('string'),
  relatedModelID: DS.attr(),
});
