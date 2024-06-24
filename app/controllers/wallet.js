import { inject as service } from '@ember/service';
import GoToRouteMixin from '../mixins/go-to-route';
import Controller from '@ember/controller';

export default Controller.extend(GoToRouteMixin, {
  tokenService: service('token'),
  actions: {
    /* 
     * copyWalletAddressToClipboard()
     *
     * Handle the user action to copy the Wallet address to the clipboard.  
     */
    copyWalletAddressToClipboard() {
      var privateAddress = this.model.wallet.address;
      // If cordova
        // use the cordova-clipboard plugin to copy the private key to the clipboard
      // else
        // use the browser variant to copy the private key to the clipboard
      if (window.cordova) {
        window.cordova.plugins.clipboard.copy(
          privateAddress,
          function () {
            alert('Your wallet address has been copied successfully.  ');
          },
          function () {
            console.log(`There was an error, sorry please try again. `);
          },
        );
      } else {
        navigator.clipboard.writeText(privateAddress).then(
          function () {
            alert('Your wallet address has been copied successfully.  ');
          },
          function () {
            console.log('There was an error, sorry please try again.');
          },
        );
      }
    },
  },
});
