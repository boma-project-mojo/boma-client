import DS from 'ember-data';
import { computed } from '@ember/object';

export default DS.Model.extend({
  walletPublicKey: DS.attr('string'),
  walletPrivateKey: DS.attr('string'),
  address: DS.attr('string'),
  QRb64: DS.attr(),
  truncatedWalletAddress: computed('address.length', function () {
    return (
      this.address.substring(0, 6) +
      '...' +
      this.address.substr(this.address.length - 5, 5)
    );
  }),
});
