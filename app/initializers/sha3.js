import { SHA3 } from 'sha3';

export function initialize(/* application */) {
  window.SHA3 = SHA3;
}

export default {
  name: 'SHA3',
  initialize,
};
