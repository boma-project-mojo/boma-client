import DS from 'ember-data';
import { htmlSafe } from '@ember/template';
import { computed } from '@ember/object';

export default DS.Model.extend({
  rev: DS.attr('string'),
  name: DS.attr(),
  start_date: DS.attr('date'),
  end_date: DS.attr('date'),
  organisation_id: DS.attr('number'),
  couchdb_design_doc_name: DS.attr(),
  aasm_state: DS.attr(),
  image_thumb: DS.attr(),
  image_thumb_base64: computed('image_thumb', function () {
    return htmlSafe(
      "background-image:url('data:image/jpeg;base64," + this.image_thumb + "'",
    );
  }),
  total_images_filesize: DS.attr(),
  list_order: DS.attr(),
  app_bundle_id: DS.attr(),
  current_app_version: DS.attr(),
  apple_app_id: DS.attr(),
  enable_festival_mode_at: DS.attr(),
  disable_festival_mode_at: DS.attr(),
  clashfinder_start_hour: DS.attr(),
  schedule_modal_type: DS.attr(),
  analysis_enabled: DS.attr(),
  feedback_enabled: DS.attr(),
});
