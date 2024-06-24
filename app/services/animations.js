/* 
  This service handles the Animations of route transitions within the app

  It contains functions that 
  - show and hide splash screens (either blackout or full image)
  - create a delay which pauses execution of code while a transition happens.  
 */

import Service from '@ember/service';

export default Service.extend({
  loadingScreenMessage: null,
  splashShown: true, //True because the splash screen is shown as standard when the app is loading
  
  /* 
   * delay()
   *
   * delayInms            int           Time to delay by in milliseconds.
   * 
   * Delay the execution of code by the number of milliseconds supplied.  
   */
  delay(delayInms) {
    return new Promise((resolve) => setTimeout(resolve, delayInms));
  },

  /*
   * showSplash()
   *
   * loadingScreenMessage     str         the message to display vertically and centrally aligned on the loading screen
   * fullImageSplash          boolean     true to show the full splash image (`#loading-screen.full-image-splash` defined in animations.css#81), if false loading is a blackout curtain
   *
   * Show the splash screen (either full image or a blackout curtain)
   */
  async showSplash(loadingScreenMessage, fullImageSplash=false) {
    if (this.splashShown === false) {
      this.set('splashShown', true);
      this.set('loadingScreenMessage', loadingScreenMessage);

      $('#loading-screen').addClass('loading-shown');

      // Set the class that shows the full image 
      if (fullImageSplash) {
        $('#loading-screen').addClass('full-image-splash');
      }else{
        $('#loading-screen').addClass('blackout');
      }

      await this.delay(250);

      $('#loading-screen').removeClass('loading-hidden');
      $('#loading-screen').removeClass('loading-removed');

      // await this.delay(250)
    }
  },

  /*
   * hideSplash()
   *
   * Hide the splash screen
   */
  async hideSplash() {
    if (this.splashShown === true) {
      $('#loading-screen').addClass('loading-hidden');
      $('body').addClass('loading-hidden');
      $('#loading-screen').removeClass('loading-shown');

      await this.delay(250);

      this.set('splashShown', false);

      $('#loading-screen').addClass('loading-removed');
      this.set('loadingScreenMessage', null);

      await this.delay(1000);

      $('#loading-screen').removeClass('full-image-splash');
    }
  },
});
