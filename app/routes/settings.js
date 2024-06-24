import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { hash } from 'rsvp';

export default Route.extend({
  tokenService: service('token'),
  settings: service('settings'),

  model() {
    return hash({
      wallet: this.tokenService.getWallet(),
      localNotificationsSetting: this.settings.getSetting(
        'local-notifications',
      ),
      articleNewsNotificationsSetting: this.settings.getSetting(
        'article-news-notifications',
      ),
      articleAudioNotificationsSetting: this.settings.getSetting(
        'article-audio-notifications',
      ),
      hqCommsNotificationsSetting: this.settings.getSetting('hq-comms'),
      submissionPublishedNotifications: this.settings.getSetting(
        'submission-published-notifications',
      ),
      submissionLoveNotifications: this.settings.getSetting(
        'submission-love-notifications',
      ),
      newPeoplesGalleryNotifications: this.settings.getSetting(
        'new-peoples-gallery-notifications',
      ),
      newCommunityEventsNotifications: this.settings.getSetting(
        'new-community-events-notifications',
      ),
      pseudonymousDataCollection: this.settings.getSetting(
        'pseudonymous-data-collection',
      ),
      lessWordyCopy: this.settings.getSetting('less-wordy-copy'),
      largerText: this.settings.getSetting('larger-text'),
      dataLastUpdatedAt: localStorage.getItem('dataLastUpdatedAt'),
    });
  },
  actions: {
    refreshModel(){
      this.refresh();
    }
  }
});
