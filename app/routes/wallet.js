import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';

export default Route.extend({
  store: service(),
  tokenService: service('token'),
  queryParams: {
    claimTokenNonce: {},
  },
  model() {
    return hash({
      wallet: this.tokenService.getWallet(),
      tokens: this.store.findAll('token2'),
    });
  },
  setupController(controller, model) {
    // Set counts of various token states.  
    var tokenStatusCounts = {
      mining: 0,
      mined: 0,
      ready: 0,
      registering: 0,
    };
    model.tokens.filter((token) => {
      tokenStatusCounts[token.token_state] =
        tokenStatusCounts[token.token_state] + 1;
    });
    controller.set('tokenStatusCounts', tokenStatusCounts);

    // Set the token count string
    var tokenCountString
    if (model.tokens.length === 1) {
      tokenCountString = `You have ${model.tokens.length} token. `;
    } else {
      tokenCountString = `You have ${model.tokens.length} tokens. `;
    }
    controller.set('tokenCountString', tokenCountString);

    this._super(controller, model);
  },
  beforeModel() {
    // Get the wallet and sync tokens with the remote server.
    this.tokenService
      .getWallet()
      .then((wallet) => {
        this.tokenService
          .syncWalletTokens(wallet.address)
          .catch((e) => {
            console.log(e);
          })
          .finally(() => {
            this.tokenService.initialisePublicTokens();
          });
      })
      .catch((e) => {
        console.log(e);
      });
  },
});
