import { computed } from '@ember/object';
import DS from 'ember-data';
import { inject as service } from '@ember/service';

export default DS.Model.extend({
  imageService: service('image'),
  rev: DS.attr('string'),
  name: DS.attr(),
  content: DS.attr(),
  image_name: DS.attr(),
  image_name_small: DS.attr(),
  image_bundled_at: DS.attr('date'),
  image_last_updated_at: DS.attr('date'),
  image: computed(
    'id',
    'image_bundled_at',
    'image_last_updated_at',
    'image_name',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'page',
        this.id,
        'image_name'
      );
    },
  ),
  image_thumb: computed(
    'id',
    'image_bundled_at',
    'image_last_updated_at',
    'image_name_small',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'page',
        this.id,
        'image_name_small'
      );
    },
  ),
  aasm_state: DS.attr('string'),
  order: DS.attr(),
  image_loader: DS.attr(),
});
