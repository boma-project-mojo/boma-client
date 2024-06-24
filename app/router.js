import EmberRouter from '@ember/routing/router';
import config from 'boma/config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL,
});

Router.map(function () {
  this.route('welcome');
  this.route('messages');
  // this.route('sign-in');
  // this.route('forgotten-password');
  // this.route('reset-password');
  // this.route('sign-up');
  this.route('pages');
  this.route('page', { path: '/pages/:page_id' });
  this.route('profile');
  this.route('map');
  this.route('events');
  this.route('productions');
  this.route('venues');
  this.route('suggestions');
  this.route('create-event');
  this.route('community-events');
  this.route('wallet');
  this.route('redeem-token', { path: '/wallet/redeem' });

  this.route('token', { path: '/token/:token_id' });
  this.route('introducing-community-events');
  this.route('people');

  this.route('settings');
  this.route('articles');
  this.route('create-article');
  this.route('splash');
  this.route('activity');
  this.route('festivals');
});

export default Router;
