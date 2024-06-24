import { later } from '@ember/runloop';
import { Promise } from 'rsvp';
import Service from '@ember/service';
import $ from 'jquery';

export default Service.extend({
  shown: false,
  status: '',
  scanSuccess: null,
  showPopover: false,
  scanBomaName: null,
  statusMessage: null,
  capture() {
    this.show();
    return new Promise((resolve) => {
      let QRScanner = window.QRScanner;
      QRScanner.show();
      this.set('status', 'Ready');
      QRScanner.scan((error, token) => {
        this.set('status', 'Captured');
        later(() => {
          this.set('status', 'Validating');
          resolve(token.replace(/^ethereum:/i, ''));
        }, 777);
      });
    });
  },
  show() {
    $('html').removeClass('loading-splash');
    $('body').removeClass('loading-splash');
    this.set('shown', true);
  },
  hide() {
    $('html').addClass('loading-splash');
    $('body').addClass('loading-splash');
    this.set('shown', false);
  },
});
