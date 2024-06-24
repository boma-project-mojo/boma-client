import GoToRouteMixin from '../mixins/go-to-route';
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { later } from '@ember/runloop';

export default Controller.extend(GoToRouteMixin, {
  token: service(),
  router: service(),
  redeemingToken: alias('token.redeemingToken'),
  tokenNetworkError: alias('token.tokenNetworkError'),
  successfullyRedeemed: alias('token.successfullyRedeemed'),
  errors: alias('token.errors'),
  queryParams: ['claimTokenNonce'],
  actions: {
    /* 
     * pasteTokenNonceFromClipboard()
     *
     * Paste the clipboard content into the claimTokenNonce attribute
     */
    pasteTokenNonceFromClipboard() {
      var self = this;
      if (window.cordova) {
        cordova.plugins.clipboard.paste(function (text) {
          self.set('claimTokenNonce', text);
        });
      } else {
        navigator.clipboard.readText().then((text) => {
          this.set('claimTokenNonce', text);
        });
      }
    },
    /* 
     * redeemToken()
     *
     * Handle the action to redeem the token for the nonce supplied.  
     */
    redeemToken() {
      var self = this;
      this.token
        .redeemToken(this.claimTokenNonce, this.model.wallet.address)
        .then(() => {
          later(() => {
            self.router.transitionTo('wallet');
          }, 5000);
        });
    }
  },
});
