/*

  This service integrates cordova-media-plugin

  NB:  Using the plugin's status callback is unreliable for various reasons

  1.  On iOS it never fires the MEDIA_STARTING callback
  2.  There is no status for BUFFERING 

  Therefore we only rely on the state from the Media plugin to know when the player is playing or paused.  

  For loading states, and handling errors we rely on the getCurrentPosition function to calculate when
  the player is advancing.  When advancing we can safely assume that the player is working.  

  For error handling, beyond the plugins error handling we also use Ember.run to timeout and reset the player 
  after 30 seconds of 'loading' as a fail safe.    

  Here is the key for the player states returned by the cordova-media-plugin

  0: 'MEDIA_NONE',
  1: 'MEDIA_STARTING',
  2: 'MEDIA_RUNNING',
  3: 'MEDIA_PAUSED',
  4: 'MEDIA_STOPPED',

*/

import Service, { inject as service } from '@ember/service';
import { later, cancel } from '@ember/runloop';

export default Service.extend({
  logger: service(),

  allowRetry: true,
  playerState: 0,
  loading: false,
  loadingClass: null,
  currentMediaModelID: null,
  currentMediaModelName: null,
  player: null,
  duration: 0,
  currentPosition: -1,
  error: null,
  message: null,
  slowLoadingCheck: null,

  /*
    Turn on the loading state 
    (use this to enable the CSS animations for loading UX in player in a pretty way)
  */
  setLoadingToTrue() {
    if (this.loading === true) return false;

    var self = this;

    // Disable retry until buffering has had 5 seconds to complete.
    this.set('allowRetry', false);

    self.setProperties({
      loading: true,
      loadingClass: 'loading',
      isAdvancing: false,
      message: 'Loading...',
      startedLoadingAt: Date.now(),
    });

    // Setup an runner to enable retry and update buffering message.
    let slowLoadingCheckRunner = later(() => {
      self.set('allowRetry', true);
      self.set('message', 'Still loading...');
    }, 10000);

    this.set('slowLoadingCheckRunner', slowLoadingCheckRunner);

    // Timeout after 30 seconds
    let timeoutErrorRunner = later(() => {
      self.handleError('Loading timed out, please try again');
    }, 15000);

    this.set('timeoutErrorRunner', timeoutErrorRunner);

    // Check that we're actually online at all
    if (window.navigator.onLine === false) {
      self.handleError('Sorry, you seem to be offline');
      cancel(slowLoadingCheckRunner);
      cancel(timeoutErrorRunner);
    }
  },

  /*
    Turn off the loading state 
    (use this to disable the CSS animations for loading UX in player in a pretty way)
  */
  setLoadingToFalse() {
    var self = this;

    // Cancel the error handling runners if content successfully loaded or an error has been handled
    let slowLoadingCheckRunner = this.slowLoadingCheckRunner;
    cancel(slowLoadingCheckRunner);
    let timeoutErrorRunner = this.timeoutErrorRunner;
    cancel(timeoutErrorRunner);
    let handleErrorRunner = this.handleErrorRunner;
    cancel(handleErrorRunner);

    // setProperties required to start the player CSS transitions
    self.setProperties({
      loading: false,
      loadingClass: 'outgoing',
      isAdvancing: true,
      allowRetry: true,
      message: 'Playing',
    });
    // complete the CSS transitions and reset
    later(() => {
      self.set('loadingClass', null);
      self.set('message', null);
      self.set('error', null);
    }, 1000);
  },

  /*
    Handle the error
    - show an error message and reset the loading classes
    - reinit the player

    @errorMessage      string      The error message to display
  */
  handleError(errorMessage) {
    var self = this;

    this.set('loading', false);
    this.set('loadingClass', null);
    this.set('message', null);
    this.set('error', errorMessage);

    var handleErrorRunner = later(() => {
      self.setLoadingToFalse();
      self.reset();
      self.set('error', null);
      self.set('allowRetry', true);
    }, 2500);

    this.set('handleErrorRunner', handleErrorRunner);
  },

  /*
    Initialise the Media object and setup the relevant callback functions

    @url               string        The URL of the audio object to play
    @currentPosition   int           The position in seconds you'd like the audio to start at (defaults to 9)
  */
  initialize(url, currentPosition = 0) {
    var self = this;

    this.logger.log(
      `%c AUDIO PLAYER - INITIALISING `,
      'DEBUG',
      'background-color: white; color: black;',
    );

    var player = new Media(
      url,
      // success callback
      function (success) {
        // If allowing a full reset of the player if the audio has stopped
        // return to the current position
        if (self.get('playerState') === 4) {
          player.seekTo(currentPosition);
        }
        self.logger.log(
          `%c AUDIO PLAYER - SUCESS ${success} `,
          'DEBUG',
          'background-color: white; color: black;',
        );
      },

      // error callback
      function (err) {
        // MediaError.MEDIA_ERR_ABORTED = 1
        // MediaError.MEDIA_ERR_NETWORK = 2
        // MediaError.MEDIA_ERR_DECODE = 3
        // MediaError.MEDIA_ERR_NONE_SUPPORTED = 4
        // Seems like commons practice for error code 0 to be NO_ERROR
        if (err.code > 0) {
          self.handleError('Sorry, there was an error.');
        }

        self.logger.log(
          `%c AUDIO PLAYER - ERROR ${err.code} ${err.message} `,
          'DEBUG',
          'background-color: red; color: white;',
        );
      },

      // status callback
      function (status) {
        let statusKey = {
          0: 'MEDIA_NONE',
          1: 'MEDIA_STARTING',
          2: 'MEDIA_RUNNING',
          3: 'MEDIA_PAUSED',
          4: 'MEDIA_STOPPED',
        };

        // 1 MEDIA_STARTING
        if (status === 1) {
          self.setLoadingToTrue();
        }

        // Set the playerState to reflect
        self.set('playerState', status);

        // Used by MusicControls plugin which allows the player to be controlled from the
        // notification screen
        window.playerState = status;

        self.logger.log(
          `%c AUDIO PLAYER - STATUS CHANGE ${statusKey[status]} `,
          'DEBUG',
          'background-color: white; color: black;',
        );
      },
    );

    this.set('player', player);

    return player;
  },

  /*
    Reset the player to initial settings and cancel 

    @url               string        The URL of the audio object to play
  */
  reset(url) {
    // If no url is supplied and the player src has yet to be defined return false
    // (i.e this is the first time the player has been used this session and there was an error)
    if (url === undefined && this.player.src === undefined) return false;
    // If no url is supplied reset to the current player src
    if (url === undefined) url = this.player.src;

    // Cancel the interval which updates the duration of the media if one exists
    if (this.checkDurationInterval) {
      var cdi = this.checkDurationInterval;
      cancel(cdi);
    }

    // Cancel the interval which updates the playhead position for the media if one exists
    if (this.updatePlayheadPositionInterval) {
      var uppi = this.updatePlayheadPositionInterval;
      cancel(uppi);
    }

    // release the player
    this.player.release();

    // reinitialise the playerState
    this.set('playerState', 0);

    // reinitialise the current model
    this.set('currentMediaModelID', null);

    // reinitialise the duration and currentPosition
    this.set('duration', null);
    this.set('currentPosition', -1);

    // reinitialise the Media object
    this.initialize(url);
  },

  /*
    Play

    @url      string              The URL of the audio object to play
    @model    ember data model    An ember data model for the related article or event
  */
  play(url, model) {
    if (this.allowRetry === false) return false;

    // Set loading to true here for best user experience (relying on the player callback feels sluggish)
    this.setLoadingToTrue();
    // If the player has already been used by another model
    // reset it and
    if (this.currentMediaModelID && this.currentMediaModelID !== model.id) {
      // reset the player
      this.reset(url);
    } else if (
      this.currentMediaModelID &&
      this.currentMediaModelID === model.id
    ) {
      // no need to reinit the player...
    } else {
      // Initialise the Media object
      this.initialize(url);
    }

    // Press Play
    this.player.play();

    // If the player is being used to serve an audio stream the app needs to be able to download data
    // whilst the app is in the background.
    if (model.audio_stream) {
      cordova.plugins.foregroundService.start(`Playing ${model.name}`);
    }

    this.checkDuration();
    this.updatePlayheadPosition();
    this.initializeMusicControls(model);

    // Set various params
    this.set('model', model); //used in retry methods below
    this.set('url', url); //used in retry method below
    this.set('currentMediaModelID', model.id); //used by audio-player component
    this.set('currentMediaModelName', model.constructor.modelName); //used by audio-player component
    this.set('currentMediaIsPlaying', true); //used by article component
  },

  /*
    Pause
  */
  pause() {
    MusicControls.updateIsPlaying(false);
    this.player.pause();
    this.set('currentMediaIsPlaying', false);

    cordova.plugins.foregroundService.stop();
  },

  /*
    Seek to the current position

    @position     integer     position to seek to in milliseconds
  */
  seekTo(position) {
    // Don't allow seeking if player hasn't started yet
    if (this.playerState < 2) return false;

    // Reset the player if the position seeking to is the end of the audio
    if (Math.floor(position) / 1000 >= this.duration - 1) {
      this.reset();
      return false;
    }

    // Show the loading spinner if the player is not paused.
    if (this.playerState !== 3) {
      this.setLoadingToTrue();

      // iOS causes a playback stalled error if you don't pause and then restart the audio when seeking
      this.player.pause();
    }
    // Set the current position tho the specified position
    this.set('currentPosition', Math.floor(position) / 1000);
    // Seek the player to the specified position.
    this.player.seekTo(position);
    // iOS causes a playback stalled error if you don't pause and then restart the audio when seeking
    if (this.playerState !== 3) {
      this.player.play();
    }

    this.logger.log(
      `%c AUDIO PLAYER - Seeked to ${position} `,
      'DEBUG',
      'background-color: white; color: black;',
    );
  },

  /*
    Get the duration of the audio that is being played
  */
  checkDuration() {
    var self = this;

    // Cordova media player must load the metadata from a file before it knows the duration of the clip
    // There is no callback for when the duration is known so instead check every second until the clip
    // length is known.
    var checkDurationInterval = later(
      this,
      function () {
        var dur = this.player.getDuration();
        // Cordova Media Player returns -1 when the duration is unknown.  If the duration is greater than 0
        // set it otherwise setup a new job to check again in 1 second.
        if (dur > 0) {
          self.logger.log(
            `%c AUDIO PLAYER - Obtained Duration ${dur} `,
            'DEBUG',
            'background-color: white; color: black;',
          );
          self.set('duration', dur);
        } else {
          this.checkDuration();
        }
      },
      1000,
    );

    // Set checkDurationInterval on the service to allow us to cancel it when resetting the player.
    this.set('checkDurationInterval', checkDurationInterval);
  },

  /*
    Update the playhead position when the player is playing.
  */
  updatePlayheadPosition() {
    var self = this;

    this.player.getCurrentPosition(
      // success callback
      function (position) {
        if (position > 0) {
          // As there is no status for buffering, when seeking, hide the loading state when the
          // currentPosition starts advancing again.
          if (
            position > self.get('currentPosition') &&
            self.get('isAdvancing') === false
          ) {
            self.setLoadingToFalse();
          }

          if (Math.floor(position) >= self.get('duration')) {
            self.set('loading', false);
            self.set('loadingClass', null);
            self.set('message', null);
            self.set('error', null);
            // Reset the player when the media stops
            self.reset();
          }

          self.set('currentPosition', position);
        }

        self.set('lastReportedPosition', position);
      },
      // error callback
      function (e) {
        self.logger.log(
          `%c AUDIO PLAYER - Error getting pos ${e} `,
          'DEBUG',
          'background-color: red; color: white;',
        );
      },
    );

    // Set an interval to update again in one second if the playerState is not paused
    var updatePlayheadPositionInterval = later(
      this,
      function () {
        if (self.get('playerState') !== 3) {
          self.updatePlayheadPosition();
        }
      },
      1000,
    );

    // Set updatePlayheadPositionInterval on the service to allow us to cancel it when resetting the player.
    this.set('updatePlayheadPositionInterval', updatePlayheadPositionInterval);
  },

  /*
    Format the time for humans

    @time      integer     The current time in milliseconds.  
  */
  humanReadableTime(time) {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = '';

    if (hrs > 0) {
      ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
    }

    ret += '' + mins + ':' + (secs < 10 ? '0' : '');
    ret += '' + secs;
    return ret;
  },

  // ------------------------------------- Music Controls Integration -------------------------------------

  initializeMusicControls(model) {
    if (MusicControls) {
      MusicControls.create(
        {
          track: model.get('title'), // optional, default : ''
          cover: model.get('image_name'),

          // hide previous/next/close buttons:
          hasPrev: false, // show previous button, optional, default: true
          hasNext: false, // show next button, optional, default: true
          dismissable: true,
          hasClose: true,
        },
        function () {
          // Successful initialised the music controls
        },
        function (err) {
          console.log(err);
        },
      );

      // Register callback
      MusicControls.subscribe(this.musicControlsEvents);

      // Start listening for events
      MusicControls.listen();

      window.player = this.player;
    }
  },

  musicControlsEvents(action) {
    const message = JSON.parse(action).message;
    switch (message) {
      case 'music-controls-pause':
        window.player.pause();
        MusicControls.updateIsPlaying(false);
        break;

      case 'music-controls-play':
        window.player.play();
        MusicControls.updateIsPlaying(true);
        break;

      case 'music-controls-media-button-play-pause':
        var playerState = window.playerState;
        if (playerState === 2) {
          window.player.pause();
          MusicControls.updateIsPlaying(false);
        } else if (playerState === 3 || playerState === 4) {
          window.player.play();
          MusicControls.updateIsPlaying(true);
        }
        break;

      default:
        break;
    }
  },
});
