import DS from 'ember-data';

export default DS.Model.extend({
  festival_id: DS.attr(),
  subject: DS.attr(),
  body: DS.attr(),
  sent_at: DS.attr(),
  notifiable_model: DS.attr(),
  notifiable_id: DS.attr(),
  notifiable_name: DS.attr(),
  notifiable_route: DS.attr(),
  notifiable_params: DS.attr(),
  notification_id: DS.attr(),
  notification_type: DS.attr(),
});
