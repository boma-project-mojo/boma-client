/* 
Token Service

This service handles

 - Creating / updating / importing wallets
 - Creating / syncing local copies of tokens
 - Validation of tokens using the QR scanner
 - Claiming tokens using the Time and Space system
 - Redeeming tokens using a single use link.  
*/

import { Promise, all } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import $ from 'jquery';
import { importData } from 'ember-local-storage/helpers/import-export';

let abi = [
  {
    constant: false,
    inputs: [{ name: 'participant', type: 'address' }],
    name: 'present',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_eventName', type: 'string' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    constant: true,
    inputs: [],
    name: 'east',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'eventEnds',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'eventName',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'eventStarts',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'participant', type: 'address' }],
    name: 'isPresent',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'north',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'south',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'west',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

import ENV from 'boma/config/environment';
import QRCode from 'qrcode';

import config from '../config/environment';

export default Service.extend({
  logger: service(),
  router: service('router'),
  settingsService: service('settings'),
  notificationsService: service('notifications'),
  getWalletTokensURL: ENV['getWalletTokensURL'],
  validateOtherURL: ENV['apiEndpoint'] + '/validate-other',
  apiEndpoint: ENV['apiEndpoint'],
  validateOwnTokenURL: ENV['validateOwnTokenURL'],
  tokenNetworkError: null,
  tokenImportFeedback: null,
  loading: false,
  QRScanner: service('qr-scanner'),
  store: service('store'),
  pouchDb: service('pouch-db'),
  location: service('location'),
  fireforSure: service('fire-for-sure'),

  appVersion: config.APP.version,

  /* * * * * * * * * * * * * * * * * * *
   *              WALLET               *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * On first load the app creates a public/private key pair which acts 
   * as an anonymous id for this user.  
   */

  /* 
   * getWallet()
   * 
   * Get the existing wallet or create a new one if one doesn't exist.  
   */
  async getWallet() {
    // Migrate legacy wallet to the new localstorage adapter.
    await this.migrateLegacyWalletToNewLocalStorageAdapter();

    return this.store.findAll('wallet').then((wallets) => {
      // If there's a wallet in localstorage load it
      if (wallets.length === 1) {
        return wallets[0];
      } else {
        // Otherwise generate a new wallet
        return this.generateWallet();
      }
    });
  },

  /* 
   * generateWallet()
   * 
   * wallet       Ethers Wallet object      Used when importing an existing public/private key pair.  
   * 
   * Create a localstorage record for the wallet.  
   */
  generateWallet(wallet = null) {
    if (wallet === null) {
      wallet = ethers.Wallet.createRandom();
    }

    return this.generateQR(wallet.address).then((QRb64) => {
      return this.store
        .createRecord(
          'wallet',
          {
            walletPublicKey: wallet.publicKey,
            walletPrivateKey: wallet.privateKey,
            address: wallet.address,
            validated: false,
            QRb64: QRb64,
          },
          (e) => {
            console.log(e);
          },
        )
        .save();
    });
  },

  /* 
   * generateQR()
   * 
   * address        hex       The public key of this wallet 
   * 
   * Get the QR for the supplied address as a base64 image.  
   */
  generateQR(address) {
    return QRCode.toDataURL('ethereum:' + address, { scale: 8, margin: 0 });
  },

  /* * * * * * * * * * * * * * * * * * *
   *         WALLET  TOKENS            *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * The app allows users to claim `tokens`, they can do so either:
   *  - by using location services and time to prove they are in a certain location 
   *    at a given time.  
   *  - by clicking a link that redeems a token 
   */

  /* 
   * syncWalletTokens()
   *
   * walletADdress      hex       The public key of the wallet to sync
   * 
   * Sync the local and server details of tokens associated with this wallet.  
   */
  syncWalletTokens(walletAddress) {
    var self = this;
    var promises = [];
    return new Promise(function (resolve, reject) {
      self
        .getWalletTokens(walletAddress)
        .then((serverTokens) => {
          if (serverTokens.length > 0) {
            serverTokens.forEach((st, index) => {
              promises[index] = self.createToken(walletAddress, st);
            });
            return all(promises).then(() => {
              resolve();
            });
          } else {
            resolve();
          }
        })
        .catch(() => {
          reject();
        });
    });
  },

  /* 
   * getWalletTokens()
   *
   * walletADdress      hex       The public key of the wallet to sync
   * 
   * Request the data for a wallet address from the server.  
   */
  getWalletTokens(walletAddress) {
    return $.ajax(this.getWalletTokensURL, {
      method: 'GET',
      data: { address: walletAddress },
      timeout: 30000,
    })
      .then((response) => {
        this.set('tokenImportError', null);
        return response.data;
      })
      .catch((error) => {
        this.set('tokenImportError', 'Network Error');
        this.set('loading', false);
        return error;
      });
  },

  /* 
   * walletAddressShortHash()
   *
   * walletAddress      hex       The public key of the wallet to sync
   * salt               str       String 
   * 
   * Generate a short hash for the wallet address plus a salt, this is used to 
   * identify whether an article was created by the current app user's wallet.
   * 
   * The salt is required to not dox the creator of the article as the short hash is
   * matched to one sent in the public couchdb record.  
   */
  walletAddressShortHash(walletAddress, salt) {
    var sha3 = new SHA3(256);
    sha3.update(walletAddress + salt);
    return sha3.digest('hex').substring(0, 8);
  },

  /* 
   * createToken()
   *
   * walletADdress      hex       The public key of the wallet to sync
   * token              object    Details about the token to create locally in the format returned by the server
   * 
   * Create or update a local token record for the supplied token.
   */  
  createToken(walletAddress, token) {
    this.store.findAll('token2').then((t2s) => {
      var tt_t2s = t2s.filter((t2) => {
        if (t2.get('server_id') === token.id) return t2;
      });

      if (tt_t2s.length > 0) {
        // token2 with this ID already exists update it
        tt_t2s[0].set('event_id', token.attributes.festival_id);
        tt_t2s[0].set('event_name', token.attributes.name);
        tt_t2s[0].set('state', token.attributes.aasm_state);
        tt_t2s[0].set('event_image_base64', token.attributes.image_base64);
        tt_t2s[0].set('tokentype_id', token.attributes.token_type_id);
        tt_t2s[0].set('event_start_date', token.attributes.event_start_date);
        tt_t2s[0].set('event_end_date', token.attributes.event_end_date);
        tt_t2s[0].set('event_center_lat', token.attributes.event_center_lat);
        tt_t2s[0].set('event_center_long', token.attributes.event_center_long);
        tt_t2s[0].set(
          'event_location_radius',
          token.attributes.event_location_radius,
        );
        tt_t2s[0].set('aasm_state', token.attributes.aasm_state);
        tt_t2s[0].set('last_updated_at', token.attributes.updated_at);
        return tt_t2s[0].save();
      } else {
        // token2 with this ID doesn't exist, create it
        var token2 = this.store.createRecord('token2', {
          server_id: token.id,
          address: walletAddress,
          event_id: token.attributes.festival_id,
          event_name: token.attributes.name,
          state: token.attributes.aasm_state,
          event_image_base64: token.attributes.image_base64,
          tokentype_id: token.attributes.token_type_id,
          event_start_date: token.attributes.event_start_date,
          event_end_date: token.attributes.event_end_date,
          event_location_radius: token.attributes.event_location_radius,
          event_center_lat: token.attributes.event_center_lat,
          event_center_long: token.attributes.event_center_long,
          aasm_state: token.attributes.aasm_state,
          last_updated_at: token.attributes.updated_at,
        });
        return token2.save();
      }
    });
  },

  /* 
   * importWalletFromPrivateKey()
   *
   * walletPrivateKey      hex       The private key of the wallet to sync
   * 
   * Import a wallet and it's associated tokens using the private key 
   */
  importWalletFromPrivateKey(walletPrivateKey) {
    var self = this;
    this.set('loading', true);
    return new Promise(function (resolve, reject) {
      if (ethers.isHexString(walletPrivateKey, 32)) {
        var wallet = new ethers.Wallet(ethers.hexlify(walletPrivateKey));
      } else {
        reject();
        self.set('tokenImportError', 'Private key not valid');
        self.set('tokenImportFeedback', null);
        self.set('loading', false);
      }

      if (wallet) {
        self.purgeWalletandTokens().then(() => {
          self.generateWallet(wallet).then(() => {
            self
              .syncWalletTokens(wallet.address)
              .then(() => {
                if (window.cordova) {
                  self.notificationsService.updateRemoteAddressRecord(
                    wallet.address,
                  );
                }

                self.set(
                  'tokenImportFeedback',
                  'Wallet imported successfully.',
                );

                self.set('tokenImportError', null);
                self.set('loading', false);
                self.initialisePublicTokens();
                resolve();
              })
              .catch(() => {
                self.set('tokenImportError', 'Network Error');
                self.set('tokenImportFeedback', null);
                self.set('loading', false);
                reject('Network Error');
              });
          });
        });
      }
    });
  },

  /* 
   * purgeWalletandTokens()
   *
   * Delete existing wallet and tokens.  Used when importing a wallet from private key.  
   */
  purgeWalletandTokens() {
    var self = this;
    var promises = [];
    return new Promise(function (resolve) {
      return self.store.findAll('token2').then((tokens) => {
        tokens.forEach((token, index) => {
          promises[index] = token.destroyRecord();
        });

        return all(promises).then(function () {
          self.getWallet().then((wallet) => {
            self.store.unloadAll('token2');
            wallet.deleteRecord();

            wallet.save().then(() => {
              wallet.unloadRecord();
              resolve();
            });
          });
        });
      });
    });
  },

  /* * * * * * * * * * * * * * * * * * *
   *          TOKEN SCANNER            *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * validateOnServer()
   *
   * token_type_id      int       id of token_type to be validated.  
   * walletAddress      hex       Public Key of wallet
   * 
   * Check the status of a token on another users wallet by making a request to the server.  
   */
  validateOnServer(token_type_id, walletAddress) {
    return $.ajax(this.validateOtherURL, {
      method: 'GET',
      data: { address: walletAddress, token_type_id: token_type_id },
      timeout: 3000,
    })
      .then((response) => {
        this.set('tokenImportError', null);
        return response;
      })
      .catch((error) => {
        this.set('tokenImportError', 'Network Error');
        return error;
      });
  },

  /* * * * * * * * * * * * * * * * * * *
   *       TIME & SPACE TOKENS         *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * 
   * TokenTypes marked 'public' are designed for users to be able to claim using the
   * Time & Space system.  This uses the phone time and location services to validate
   * whether a user is in the time and space of an event.  
   * 
   * If they are then a long polling request is set to register the token with our server
   * which then subsequently mines a token on the blockchain to record this.  
   * 
   * The lifecycle of tokens is as follows
   *
   * 1.  Initialised ( initialisePublicTokens() )
   * 2.  Check location ( validateTokenUsingLocation() )
   * 3.  Register with server ( registerToken() )
   * 4.  Waiting to be mined
   * 5.  Mined
   */

  /* 
   * initialisePublicTokens()
   *
   * Tokens for which a status of 'public' is true trigger the app to generate a stub token
   * object in local storage with the state initialised.  
   * 
   * This is to allow Time & Space tokens to be claimed.  User's can find the stub token in their
   * wallet and trigger the process to claim the token from there.  
   */
  initialisePublicTokens() {
    var self = this;
    return new Promise(function (resolve) {
      var promises = [];
      self.store.findAll('tokentype').then((tts) => {
        var publicTTs = tts.filter((tt) => {
          if (tt.is_public === true) return true;
        });

        publicTTs.forEach((tt, index) => {
          self.store.findAll('token2').then((t2s) => {
            var tt_t2s = t2s.filter((t2) => {
              if (t2.get('tokentype_id') == tt.id) {
                return t2;
              }
            });

            if (tt_t2s.length === 0) {
              promises[index] = self.initialiseToken(tt);
            }
          });
        });
        return all(promises)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            console.log(error);
          });
      });
    });
  },

  /* 
   * initialisePublicTokens()
   *
   * tokenType        object      The 'Token Type' object
   * 
   * Create a token with status 'initialised' for the given tokenType 
   */
  initialiseToken(tokenType) {
    var self = this;
    return new Promise(function (resolve) {
      if (
        tokenType.event_end_time &&
        moment(tokenType.event_end_time).diff(moment(), 'minutes') < 0
      ) {
        resolve();
        return false;
      }

      self.logger.log(`initialising token2 for ${tokenType.name}`, 'DEBUG');

      var token2 = self.store.createRecord('token2', {
        event_name: tokenType.name,
        event_image_base64: tokenType.image_base64,
        tokentype: tokenType,
        tokentype_id: tokenType.id,
        event_start_date: tokenType.event_start_time,
        event_end_date: tokenType.event_end_time,
        event_location_radius: tokenType.event_radius,
        event_center_lat: tokenType.event_center_lat,
        event_center_long: tokenType.event_center_long,
        aasm_state: 'initialised',
        last_updated_at: moment(),
      });

      token2.save().then((token) => {
        resolve(token);
      });
    });
  },

  /* 
   * validateTokenUsingLocation()
   *
   * token        object      The Ember data Token object
   * 
   * Check that the user's current location is within the geofence of the token
   * If it is resolve a promise, otherwise reject it.
   */
  validateTokenUsingLocation(token) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self.store
        .findRecord('tokentype', token.tokentype_id)
        .then((tokentype) => {
          self.location
            .getAccurateCurrentPosition()
            .then((location) => {
              console.log(
                'location',
                location,
                location.coords.latitude,
                location.coords.longitude,
                tokentype.get('event_center_lat'),
                tokentype.get('event_center_long'),
                tokentype.get('event_radius'),
              );
              if (
                self.location.withinGeofence(
                  [location.coords.latitude, location.coords.longitude],
                  [
                    tokentype.get('event_center_lat'),
                    tokentype.get('event_center_long'),
                  ],
                  tokentype.get('event_radius'),
                )
              ) {
                resolve(true);
              } else {
                reject('out-of-bounds');
              }
            })
            .catch((e) => {
              console.log(e);
              reject(e);
            });
        });
    });
  },

  /* 
   * registerToken()
   *
   * walletAddress        hex         The wallet public key
   * token                object      The Ember data Token object
   * 
   * Create a fire-for-sure request to Register a token which has been validated
   * to be in the correct time and space with the server.
   */  
  registerToken(walletAddress, token) {
    return this.fireforSure
      .criticalPost(
        this.validateOwnTokenURL,
        {
          address: walletAddress,
          token_type_id: token.get('tokentype_id'),
          client_id: token.get('id'),
        },
        'token',
      )
      .then(() => {
        console.log(`Fire-for-sure set ${token}`);
      })
      .catch(() => {
        this.set('tokenNetworkError', 'Sorry there was a problem.');
      });
  },

   /* 
   * registerTokenNow()
   *
   * walletAddress        hex         The wallet public key
   * token                object      The Ember data Token object
   * 
   * Register a token with the server immediately (skipping fire-for-sure)
   */   
  registerTokenNow(walletAddress, token) {
    var self = this;

    self.set('loading', true);

    return $.ajax(this.validateOwnTokenURL, {
      method: 'POST',
      data: {
        festival_id: token.get('tokentype.festival_id'),
        address: walletAddress,
        token_type_id: token.get('tokentype_id'),
        client_id: token.get('id'),
      },
      timeout: 3000,
    })
      .then((response) => {
        self.set('loading', false);
        return response;
      })
      .catch(() => {
        self.set('loading', false);
        this.set('tokenNetworkError', "Sorry we couldn't reach the server.");
      });
  },

  /* * * * * * * * * * * * * * * * * * *
   *   REDEEM A TOKEN VIA A LINK       *
   * * * * * * * * * * * * * * * * * * */

  /* 
   * Users can also redeem tokens using a single use link or code. 
   */
  successfullyRedeemed: false,
  redeemingToken: null,
  errors: null,

  /* 
   * redeemToken()
   *
   * claimTokenNonce        string    The nonce for the token this user wants to claim.  
   * walletAddress          hex       The wallet public key
   * 
   * Claim a token which is already initialised on the server by supplying the token nonce.  
   */   
  redeemToken(claimTokenNonce, walletAddress) {
    var self = this;

    self.set('redeemingToken', true);

    return new Promise(function (resolve, reject) {
      return $.ajax(self.apiEndpoint + 'redeem-token', {
        method: 'POST',
        data: {
          nonce: claimTokenNonce,
          address: walletAddress,
        },
      })
        .then((response) => {
          console.log(response);
          self.set('redeemingToken', false);
          if (response.success === true) {
            self.set('successfullyRedeemed', true);
            self.set('errors', response.error, null);

            self
              .syncWalletTokens(walletAddress)
              .then(() => {
                resolve();
              })
              .catch(() => {
                reject();
              });
          } else {
            self.set('errors', response.error);
            reject();
          }
        })
        .catch(() => {
          self.set('redeemingToken', false);
          self.set('tokenNetworkError', true);
          self.set(
            'errors',
            'It looks like you might be offline, please try again later.',
          );
          reject();
        });
    });
  },

  /* 
  migrateLegacyWalletToNewLocalStorageAdapter()

  In autumn 2023  https://github.com/locks/ember-localstorage-adapter was removed in favour of
  https://github.com/funkensturm/ember-local-storage as 'ember-localstorage-adapter' was no longer 
  maintained and not compatible with the latest LTS versions of ember-cli.  

  This function migrates the legacy wallet to the new local storage adapter.  
  */
  migrateLegacyWalletToNewLocalStorageAdapter() {
    var self = this;
    return new Promise(function (resolve, reject) {
      // There is only need to migrate a wallet once, if a wallet is successfully migrated the following
      // localstorage record should have been set.  If it has then skip further migration.
      if (localStorage.getItem('legacyWalletSuccessfullyMigrated') === 'true') {
        resolve();
        return;
      }

      let legacyLSRecord = localStorage.getItem('DS.LSAdapter');
      let parsedLegacyLSRecord = JSON.parse(legacyLSRecord);

      if (legacyLSRecord && parsedLegacyLSRecord.wallet.records != undefined) {
        let legacyWallet = parsedLegacyLSRecord.wallet.records[0];

        self.logger.log(`migrating legacy wallet`, 'DEBUG');

        // Attributes cannot be imported as camel case, convert relevant attributes accordingly.
        legacyWallet.wallet_public_key = legacyWallet.walletPublicKey;
        delete legacyWallet.walletPublicKey;
        legacyWallet.wallet_private_key = legacyWallet.walletPrivateKey;
        delete legacyWallet.walletPrivateKey;
        legacyWallet.qrb64 = legacyWallet.QRb64;
        delete legacyWallet.QRb64;

        // Build the object for importing.
        let legacyWalletForImport = {
          data: [
            {
              id: legacyWallet.id,
              type: 'wallets',
              attributes: legacyWallet,
            },
          ],
        };

        // The import method expects a json object where attribute 'data' is an array of records to import
        // let legacyWalletSerialisedForImport = { data: [legacyWallet] };
        // Use the 'ember-local-storage' importData method to import the wallet
        importData(self.store, JSON.stringify(legacyWalletForImport)).then(
          () => {
            localStorage.setItem('legacyWalletSuccessfullyMigrated', true);
            resolve();
          },
        );
      } else {
        localStorage.setItem('legacyWalletSuccessfullyMigrated', true);
        resolve();
      }
    });
  },

});
