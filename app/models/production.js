import { computed } from '@ember/object';
import DS from 'ember-data';
import { inject as service } from '@ember/service';

export default DS.Model.extend({
  imageService: service('image'),
  rev: DS.attr('string'),
  name: DS.attr(),
  events: DS.attr(),
  // sorted_events: function(){
  //   var events = this.get('events');
  //   return events.sortBy('start_time');
  // }.property('events'),
  tags: DS.attr(),
  description: DS.attr(),
  short_description: DS.attr(),
  image_name: DS.attr(),
  image_name_small: DS.attr(),
  image_bundled_at: DS.attr('date'),
  image_last_updated_at: DS.attr('date'),
  using_bundle_image: computed(
    'image_bundled_at',
    'image_last_updated_at',
    function () {
      return moment(this.image_bundled_at) > moment(this.image_last_updated_at);
    },
  ),
  image_thumb: computed(
    'id',
    'model.{image_loader,image_name_small}',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'production',
        this.id,
        'image_name_small'
      );
    },
  ),
  image: computed('id', 'model.{image_loader,image_name}', function () {
    return this.imageService.getImageBackgroundImageCSS(
      this,
      'production',
      this.id,
      'image_name'
    );
  }),
  // image_thumb_base64: computed('images.length', function(){
  //   if(this.images.length > 0){
  //     return this.images[0].data;
  //   }
  // }),
  image_loader: DS.attr(),
  // images: DS.attr('attachments', {
  //   defaultValue: function() {
  //     return [];
  //   }
  // }),
  aasm_state: DS.attr(),
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
  external_link: DS.attr(),
});
