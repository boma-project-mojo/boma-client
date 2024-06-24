import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import { later } from '@ember/runloop';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  queryParams: {
    claimTokenNonce: {},
  },
  model() {
    var tokens = this.store.findAll('token2').then((token2s) => {
      return token2s.filter((token2) => {
        if (token2.tokentype_id !== 5) {
          return token2;
        }
      });
    });

    return hash({
      wallet: this.tokenService.getWallet(),
      tokens: tokens,
    });
  },
  afterModel(model) {
    let params = this.paramsFor(this.routeName);

    if (params.claimTokenNonce) {
      this.tokenService
        .redeemToken(params.claimTokenNonce, model.wallet.address)
        .then(() => {
          later(() => {
            this.router.transitionTo('wallet');
          }, 5000);
        });
    }

    this._super(...arguments);
  },
  resetController(controller, isExiting, transition) {
    if (isExiting && transition.targetName !== 'error') {
      controller.set('claimTokenNonce', null);
      this.tokenService.set('redeemingToken', null);
      this.tokenService.set('tokenNetworkError', null);
      this.tokenService.set('successfullyRedeemed', null);
    }
  },
});
