import { computed } from '@ember/object';
import { equal } from '@ember/object/computed';
import DS from 'ember-data';
import { inject as service } from '@ember/service';
import isPreferredMixin from '../mixins/is-preferred';

export default DS.Model.extend(isPreferredMixin, {
  imageService: service('image'),
  QRScanner: service('qr-scanner'),
  rev: DS.attr(),
  last_updated_at: DS.attr('date'),
  name: DS.attr(),
  description: DS.attr(),
  short_description: DS.attr('string'),
  image_name: DS.attr(),
  image_name_small: DS.attr(),
  event_name: DS.attr(),
  venue_name: DS.attr(),
  venue_subtitle: DS.attr(),
  venue_name_and_subtitle: DS.attr(),
  venue_address: DS.attr(),
  venue_lat: DS.attr(),
  venue_long: DS.attr(),
  venue_external_map_link: DS.attr(),
  venue_has_location: DS.attr('boolean'),
  venue_use_external_map_link: DS.attr('boolean'),
  venue_name_for_css: DS.attr(),
  venue_city: DS.attr(),
  venue_list_order: DS.attr(),
  venue_include_in_clashfinder: DS.attr('boolean'),
  start_time: DS.attr('date'),
  end_time: DS.attr('date'),
  production_id: computed(
    // eslint-disable-next-line ember/use-brace-expansion
    'productions.firstObject.id',
    'productions.length',
    function () {
      var production_id;
      if (this.productions.length > 0) {
        production_id = this.productions.firstObject.id;
      }
      return production_id;
    },
  ),
  productions: DS.attr(),
  productions_names: computed('productions', function () {
    var prod_names = [];
    if (this.productions) {
      this.productions.forEach((prod, i) => {
        prod_names[i] = prod.name;
      });
    }
    return prod_names.toString();
  }),
  venue: DS.attr(),
  venue_id: DS.attr('number'),
  sort_order: DS.attr('number'),
  tags: DS.attr(),
  event_tags: DS.attr(),
  filter_day: DS.attr('string'),
  date_string_start: DS.attr('string'),
  date_string_end: DS.attr('string'),
  aasm_state: DS.attr('string'),
  // preference: DS.belongsTo('preference', {async: true}),
  image_state: 'cached',
  external_link: DS.attr(),
  image_thumb: computed(
    'model.{image_loader,image_name_small}',
    'production_id',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'production',
        this.production_id,
        'image_name_small'
      );
    },
  ),
  image: computed(
    'model.{image_loader,image_name}',
    'production_id',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'production',
        this.production_id,
        'image_name'
      );
    },
  ),
  image_base64: DS.attr(),
  // images: DS.attr('attachments', {
  //   defaultValue: function() {
  //     return [];
  //   }
  // }),
  // isPreferred: computed('id', 'preference', 'store', function() {
  //   var preferenceEventIds = [];
  //   this.store.peekAll('preference').filter(function(preference){
  //     preferenceEventIds.push(preference.get('event_id'));
  //   });
  //   return preferenceEventIds.includes(this.id);
  // }),
  preferredAt: DS.attr('string'),
  image_bundled_at: DS.attr('date'),
  image_last_updated_at: DS.attr('date'),
  event_type: DS.attr('string'),
  is_community_event: equal('event_type', 'community_event'),
  showImage: computed(
    'image_name',
    'image_bundled_at',
    'image_state',
    function () {
      if (
        this.image_name &&
        (this.image_bundled_at || this.image_state === 'cached')
      ) {
        return true;
      } else {
        return false;
      }
    },
  ),
  virtual_event: DS.attr('boolean'),
  image_loader: DS.attr('string'),
  audio_stream: DS.attr('boolean'),
  isLive: computed('start_time', 'end_time', function () {
    var startDiff = moment(this.start_time).diff(moment(), 'minutes');
    var endDiff = moment(this.end_time).diff(moment(), 'minutes');

    return startDiff < 0 && endDiff > 0;
  }),
  isInFuture: computed('start_time', 'end_time', function () {
    var diff = moment(this.start_time).diff(moment(), 'minutes');
    return diff > 0;
  }),
  featured: DS.attr('boolean'),
  festival_id: DS.attr(),
  ticket_link: DS.attr(),
  // For clashfinder
  start_position: DS.attr(),
  end_position: DS.attr(),
  event_duration_in_mins: DS.attr(),
  start_hour: DS.attr(), 
  start_day: DS.attr(),
  end_day: DS.attr(),
  end_hour: DS.attr(),
  end_mins: DS.attr()
});
