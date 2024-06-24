import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import DS from 'ember-data';
import { inject as service } from '@ember/service';
import isPreferredMixin from '../mixins/is-preferred';

export default DS.Model.extend(isPreferredMixin, {
  imageService: service('image'),
  rev: DS.attr('string'),
  title: DS.attr(),
  standfirst: DS.attr(),
  content: DS.attr(),
  external_link: DS.attr(),
  image_name: DS.attr(),
  image_name_small: DS.attr(),
  image_bundled_at: DS.attr('date'),
  image_last_updated_at: DS.attr('date'),
  image_thumb: computed(
    'id',
    'model.{image_loader,image_name_small}',
    function () {
      return this.imageService.getImageBackgroundImageCSS(
        this,
        'article',
        this.id,
        'image_name_small'
      );
    },
  ),
  image: computed('id', 'model.{image_loader,image_name}', function () {
    return this.imageService.getImageBackgroundImageCSS(
      this,
      'article',
      this.id,
      'image_name'
    );
  }),
  imageSrc: reads('image_name'),
  aasm_state: DS.attr('string'),
  tags: DS.attr(),
  audio_url: DS.attr(),
  video_url: DS.attr(),
  address_short_hash: DS.attr('string'),
  article_type: DS.attr('string'),
  preference: DS.belongsTo('preference', { async: true, inverse: 'article' }),
  last_updated_at: DS.attr('date'),
  external_link_for_display: computed('external_link', function () {
    return this.external_link.match(/http(s)?:\/\/[A-Za-z0-9.]+/)[0];
  }),
  // unused but left for further investigation
  image_loader: DS.attr('string'),
  featured: DS.attr(),
  surveys: DS.attr(),
});
