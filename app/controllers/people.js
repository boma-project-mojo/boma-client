import { alias } from '@ember/object/computed';
import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
  applicationController: controller('application'),
  headerService: service('header'),
  headerBottomShown: alias('headerService.headerBottomShown'),

  filterService: service('filter'),
  searchKeyword: alias('filterService.searchKeyword'),
});
