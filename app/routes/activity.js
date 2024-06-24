import Route from '@ember/routing/route';
import { hash } from 'rsvp';
import { inject as service } from '@ember/service';

export default Route.extend({
  activity: service('activity'),
  store: service(),
  model() {
    let activities = this.activity.getActivity();
    let tags = this.store.findAll('tag');

    return hash({
      tags: tags,
      activities: activities,
    })
      .then((hash) => {
        return hash;
      })
      .catch((err) => {
        console.log('error', err);
      });
  },
});
