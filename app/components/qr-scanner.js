import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import Component from '@ember/component';

export default Component.extend({
  QRScanner: service('qr-scanner'),
  QRScannerShown: alias('QRScanner.shown'),
  QRScannerStatus: alias('QRScanner.status'),
  QRScannerShowPopover: alias('QRScanner.showPopover'),
  QRScannerScanSuccess: alias('QRScanner.scanSuccess'),
  QRScannerScanBomaName: alias('QRScanner.scanBomaName'),
  QRScannerScannerStatusMessage: alias('QRScanner.statusMessage'),
  init() {
    this._super(...arguments);
  },
  actions: {
    hide: function () {
      this.set('QRScannerShowPopover', false);
      this.set('QRScannerScanSuccess', null);
      this.QRScanner.hide();
    },
  },
});
