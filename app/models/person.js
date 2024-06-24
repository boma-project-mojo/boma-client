import DS from 'ember-data';

export default DS.Model.extend({
  rev: DS.attr('string'),
  firstname: DS.attr(),
  surname: DS.attr(),
  email: DS.attr(),
  company: DS.attr(),
  job_title: DS.attr(),
  aasm_state: DS.attr('string'),
});
