import Component from '@ember/component';
import $ from 'jquery';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Component.extend({
  tokenService: service('token'),
  logger: service(),

  tokenImportError: alias('tokenService.tokenImportError'),
  tokenImportFeedback: alias('tokenService.tokenImportFeedback'),

  loading: alias('tokenService.loading'),

  didRender() {
    this._super(...arguments);
    $('input, textarea').unbind();
    // Temporary solution to the iOS keyboard issue (viewport not updated after removing keyboard
    $('input, textarea').on('blur touchleave touchcancel', function () {
      window.scrollTo(0, 0);
    });
  },

  actions: {
    /* 
     * importWallet()
     *
     * Import a wallet from a private key.  
     */
    importWallet() {
      // If the user has supplied a private key 
        // import the wallet
      // else
        // alert an error
      if (this.importWalletPrivateKey != undefined) {
        this.set('loading', true);
        this.tokenService
          .importWalletFromPrivateKey(this.importWalletPrivateKey)
          .then(() => {
            this.set('loading', false);
          })
          .catch((e) => {
            console.log(e);
            this.set('loading', false);
          });
      } else {
        alert('Please enter your wallet private key.');
      }
    },
    /* 
     * pastePrivateKeyFromClipboard()
     *
     * Paste a private key from the clipboard.  
     */
    pastePrivateKeyFromClipboard() {
      var self = this;
      // If cordova
        // Use the cordova clipboard plugin to paste the private key
      // else
        // Use the navigator clipboard to paste the private key
      if (window.cordova) {
        cordova.plugins.clipboard.paste(function (text) {
          self.set('importWalletPrivateKey', text);
        });
      } else {
        navigator.clipboard.readText().then((text) => {
          this.set('importWalletPrivateKey', text);
        });
      }
    },
    /* 
     * copyPrivateKeyToClipboard()
     *
     * Copy the private key to the clipboard.
     */
    copyPrivateKeyToClipboard(privateKey) {
      // If cordova
        // Use the cordova clipboard plugin to copy the private key
      // else
        // Use the navigator clipboard to copy the private key
      if (window.cordova) {
        window.cordova.plugins.clipboard.copy(
          privateKey,
          function () {
            alert(
              'Your wallet private key has been copied successfully.  Keep this in a safe place so that you can import your wallet in future.  ',
            );
          },
          function () {
            console.log('There was an error, sorry please try again.');
          },
        );
      } else {
        navigator.clipboard.writeText(privateKey).then(
          function () {
            alert(
              'Your wallet private key has been copied successfully.  Keep this in a safe place so that you can import your wallet in future.  ',
            );
          },
          function () {
            console.log('There was an error, sorry please try again.');
          },
        );
      }
    },
  },
});
