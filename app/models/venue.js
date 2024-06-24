import { computed } from '@ember/object';
import { htmlSafe } from '@ember/template';
import DS from 'ember-data';
import { inject as service } from '@ember/service';
import isPreferredMixin from '../mixins/is-preferred';

export default DS.Model.extend(isPreferredMixin, {
  imageService: service('image'),
  rev: DS.attr(),
  name: DS.attr(),
  subtitle: DS.attr(),
  name_and_subtitle: DS.attr(),
  events: DS.hasMany('event', { dontsave: true, async: true, inverse: null }),
  lat: DS.attr(),
  long: DS.attr(),
  image_name: DS.attr(),
  image_name_small: DS.attr(),
  venue_type: DS.attr(),
  description: DS.attr(),
  opening_times: DS.attr(),
  menu: DS.attr(),
  dietary_requirements: DS.attr(),
  has_events: DS.attr('boolean'),
  has_location: DS.attr('boolean'),
  external_map_link: DS.attr(),
  use_external_map_link: DS.attr('boolean'),
  is_retailer: computed('venue_type', function () {
    var is_retailer = false;
    if (this.venue_type === 'retailer') {
      is_retailer = true;
    }
    return is_retailer;
  }),
  id_as_array: computed('id', function () {
    return [String(this.id)];
  }),
  backgroundImage: computed('image_name', function () {
    return htmlSafe('background-image:url(' + this.image_name + ');');
  }),
  backgroundImageSmall: computed('image_name_small', function () {
    return htmlSafe('background-image:url(' + this.image_name_small + ');');
  }),
  using_bundle_image: computed(
    'image_bundled_at',
    'image_last_updated_at',
    function () {
      return moment(this.image_bundled_at) > moment(this.image_last_updated_at);
    },
  ),
  image_last_updated_at: DS.attr('date'),
  // image: computed('id','image_bundled_at','image_last_updated_at', 'image_name_small', function() {
  //   return this.imageService.getImageBackgroundImageCSS(this);
  // }),
  image_thumb: computed(
    'id',
    'model.{image_loader,image_name_small}',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'venue',
        this.id,
        'image_name_small'
      );
    },
  ),
  image: computed('id', 'model.{image_loader,image_name}', function () {
    return this.imageService.getImageBackgroundImageCSS(this, 'venue', this.id, 'image_name');
  }),

  // image_thumb_base64: computed('images', function(){
  //   if(this.images.length > 0){
  //     return this.images[0].data;
  //   }
  // }),
  // image_thumb_small_base64: computed('images', function(){
  //   if(this.images.length > 0){
  //     return this.images[1].data;
  //   }
  // }),
  // images: DS.attr('attachments', {
  //   defaultValue: function() {
  //     return [];
  //   }
  // }),
  image_bundled_at: DS.attr('date'),
  list_order: DS.attr(),
  tags: DS.attr(),
  city: DS.attr(),
  image_loader: DS.attr(),
  aasm_state: DS.attr(),
});
