import Controller from '@ember/controller';
import { computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { later, cancel } from '@ember/runloop';

export default Controller.extend({
  tokenService: service('token'),
  loading: alias('tokenService.loading'),

  fireforSure: service('fire-for-sure'),
  retryingNow: alias('fireforSure.retryingNow'),
  loadingSucceeded: alias('fireforSure.loadingSucceeded'),
  loadingFailed: alias('fireforSure.loadingFailed'),
  secondsUntilNextAttempt: alias('fireforSure.secondsUntilNextAttempt'),

  QRScanner: service('qr-scanner'),
  QRScannerShown: alias('QRScanner.shown'),
  QRScannerStatus: alias('QRScanner.status'),
  QRScannerStatusShowPopover: alias('QRScanner.showPopover'),
  QRScannerStatusScanSuccess: alias('QRScanner.scanSuccess'),
  QRScannerStatusMessage: alias('QRScanner.statusMessage'),
  QRScannerScanBomaName: alias('QRScanner.scanBomaName'),

  tokenNetworkError: alias('tokenService.tokenNetworkError'),

  // The QR Scanner can also be used to validate and register a 
  // token for a wallet.  This is an alternative method for validating 
  // tokens where network on site is very poor and it is required
  // for the tokens to be registered before leaving the festival site.  
  // 
  // To allow an app instance to be used as a validator give the app's wallet
  // a token which includes the words validator in the token type name.  
  is_validator: computed('model.tokens', function () {
    var isValidator = false;
    var validatorToken = this.model.tokens.filter((token) => {
      if (token.event_name.toLowerCase().search('validator') != -1) {
        return token;
      }
    });

    if (validatorToken.length > 0) {
      isValidator = true;
    }
    return isValidator;
  }),

  /* 
   * resetTokenStatusPopover()
   *
   * Clear the token status popover.  
   * 
   * @token           Ember data object   The ember data object for this token.  
   * @scanFunction    String              The function the scanner is being used for (scan or scanToValidate)  
   */
  resetTokenStatusPopover(token, scanFunction) {
    var self = this;
    later(() => {
      // Reset all status 
      self.set('QRScannerStatusShowPopover', false);
      self.set('QRScannerStatusScanSuccess', null);
      self.set('QRScannerScanBomaName', null);
      self.set('QRScannerStatusMessage', null);
      // Reinitialise the scanner.  
      if (self.get('QRScannerShown')) {
        if (scanFunction === 'scan') {
          self.scan(token);
        } else if (scanFunction === 'scanToValidate') {
          self.scanToValidate(token);
        }
      }
    }, 3000);
  },
  /* 
   * scan()
   *
   * Scan a token to validate that it's correct on the server.  
   * 
   * @token           Ember data object   The ember data object for this token.  
   * @scanFunction    String              The function the scanner is being used for (scan or scanToValidate)  
   */
  scan(token) {
    var self = this;
    // let walletAddressQR = '0xfc2d4e5f5dce58ec24d8d8602ef734ef3ebc3be3'; //debugging (comment out QR capture)
    // let walletAddressQR = '0x4bee4f9f48e80cb0dbb43ba064d07fa6202c092'; //debugging not valid token
    this.QRScanner.capture().then((walletAddressQR) => {
      this.tokenService
        .validateOnServer(token.tokentype_id, walletAddressQR)
        .then((result) => {
          this.set('QRScannerStatusShowPopover', true);
          this.set('QRScannerStatusScanSuccess', result.token_status);
          this.set('QRScannerScanBomaName', token.event_name);

          if (result.token_status === true) {
            this.set('QRScannerStatus', 'Valid');
            this.playSuccessSound();
          } else if (result.token_status === false) {
            this.set('QRScannerStatus', 'Invalid');
            this.playFailSound();
          } else {
            self.set(
              'QRScannerStatusMessage',
              "Sorry, you're not connected. Check your network connection.",
            );
          }

          this.resetTokenStatusPopover(token, 'scan');
        })
        .catch((e) => {
          console.log(e);
          self.set('QRScannerStatusShowPopover', true);
          self.set(
            'QRScannerStatusMessage',
            "Sorry, you're not connected. Check your network connection.",
          );

          this.resetTokenStatusPopover(token, 'scan');
        });
    });
  },
  /* 
   * scanToValidate()
   *
   * Use the scanner to register another app users token on the server.  
   * 
   * @token           Ember data object   The ember data object for this token.  
   * @scanFunction    String              The function the scanner is being used for (scan or scanToValidate)  
   */
  scanToValidate(token) {
    var self = this;
    // let walletAddressQR = '0xfc2d4e5f5dce58ec24d8d8602ef734ef3ebc3be3'; //debugging (comment out QR capture)
    // let walletAddressQR = '0x4bee4f9f48e80cb0dbb43ba064d07fa6202c092'; //debugging not valid token
    this.QRScanner.capture().then((walletAddressQR) => {
      this.tokenService
        .registerTokenNow(walletAddressQR, token)
        .then((response) => {
          if (response.success === false) {
            // Handles where scanToValidate fails
            self.playFailSound();
            self.set('QRScannerStatus', 'Error');

            self.set('QRScannerScanSuccess', false);
            self.set('QRScannerStatusShowPopover', true);
            self.set('QRScannerStatusMessage', response.error);
          } else {
            // Handles where scanToValidate is successful
            self.playSuccessSound();

            self.set('QRScannerStatus', 'Valid');

            self.set('QRScannerStatusShowPopover', true);
            self.set('QRScannerStatusMessage', 'Token successfully validated.');
            self.set('QRScannerStatusScanSuccess', true);
            self.set('QRScannerScanSuccess', true);
          }

          this.resetTokenStatusPopover(token, 'scanToValidate');
        })
        .catch((e) => {
          // Handles no network...
          console.log(e);

          this.playFailSound();

          self.set('QRScannerStatusShowPopover', true);
          self.set(
            'QRScannerStatusMessage',
            "Sorry, you're not connected. Check your network connection.",
          );

          this.resetTokenStatusPopover(token, 'scanToValidate');
        });
    });
  },
  /* 
   * playSuccessSound()
   *
   * Play the success sound 
   */ 
  playSuccessSound() {
    $('#success').trigger('load');
    $('#success').trigger('play');
  },
  /* 
   * playFailSound()
   *
   * Play the fail sound 
   */ 
  playFailSound() {
    $('#fail').trigger('load');
    $('#fail').trigger('play');
  },

  actions: {
    /* 
     * scan()
     *
     * Scan another users wallet to check they have a valid version of this token
     * 
     * @token      Ember data object     The ember data object of the token you want to check.  
     */     
    scan(token) {
      this.scan(token);
    },
    /* 
     * scanToValidate()
     *
     * Scan another users wallet to validate their token
     * 
     * @token      Ember data object     The ember data object of the token you want to validate.  
     */    
    scanToValidate(token) {
      this.scanToValidate(token);
    },
    /* 
     * validateLocationForToken()
     *
     * Check the user's location is valid for this token and if so register the token.  
     * 
     * @wallet      Ember data object     The ember data object of the wallet
     * @token       Ember data object     The ember data object of the token you want to check location for
     */    
    validateLocationForToken(wallet, token) {
      // Cancel any existing job to reset a failed attempt to validate the location.  
      cancel(this.setStateLater);
      // Set the token state to validating.  
      token.set('aasm_state', 'validating');
      this.set('loading', true);
      // Attempt to validate the user's location
      this.tokenService
        .validateTokenUsingLocation(token)
        .then(() => {
          // If success, set the token state as 'registering'...
          token.set('aasm_state', 'registering');
          token.save().then(() => {
            // ...and register the token with the server.  
            this.tokenService.registerToken(wallet.get('address'), token);
            this.set('loading', false);
          });
        })
        .catch((result) => {
          // If fail, set the token state as the result
          token.set('aasm_state', result);
          // Set a timeout to reset the token state after the error has been shown
          // to the user.  
          var setStateLater = later(function () {
            token.set('aasm_state', 'initialised');
          }, 3000);
          this.set('setStateLater', setStateLater);
          this.set('loading', false);
        });
    },
    /* 
     * retryRegisterTokenNow()
     *
     * Retry registering the token immediately
     */   
    retryRegisterTokenNow() {
      this.fireforSure.retryNow();
    },
    /* 
     * reloadWallet()
     *
     * Sync the wallet to get the latest state for tokens.
     * 
     * @wallet      Ember data object     The ember data object of the wallet
     */   
    reloadWallet(wallet) {
      this.set('loading', true);
      this.tokenService
        .syncWalletTokens(wallet.address)
        .catch(() => {
          this.set('tokenNetworkError', "Sorry we couldn't reach the server.");
        })
        .finally(() => {
          this.set('loading', false);
        });
    },
  },
});
