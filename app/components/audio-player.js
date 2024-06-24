import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';

export default Component.extend({
  audioPlayer: service('audio-player'),
  playerState: alias('audioPlayer.playerState'),
  loading: alias('audioPlayer.loading'),
  loadingClass: alias('audioPlayer.loadingClass'),
  currentPosition: alias(`audioPlayer.currentPosition`),
  duration: alias('audioPlayer.duration'),
  isAdvancing: alias('audioPlayer.isAdvancing'),
  error: alias('audioPlayer.error'),
  message: alias('audioPlayer.message'),

  currentMediaModelID: alias('audioPlayer.currentMediaModelID'),
  
  isPlaying: computed(
    'playerState',
    'currentMediaModelID',
    'model.id',
    'isAdvancing',
    function () {
      // if the audio from this model is currently being handled by the player
      // and the playerstate is MEDIA_RUNNING
      // and the media player is advancing forward
        // return true
      // else
        // return false
      return (
        this.currentMediaModelID === this.model.id &&
        this.playerState === 2 &&
        this.isAdvancing === true
      );
    },
  ),

  isCurrentModel: computed('currentMediaModelID', 'model.id', function () {
    return this.currentMediaModelID === this.model.id;
  }),

  isPlayingOrPaused: computed(
    'currentMediaModelID',
    'model.id',
    'playerState',
    'isAdvancing',
    function () {
      // if the audio from this model is currently being handled by the player
      // and the playerstate is MEDIA_RUNNING
      // and the media player is advancing forward
      // or the playerstate is MEDIA_PAUSED
        // return true
      // else
        // return false
      return (
        this.currentMediaModelID === this.model.id &&
        ((this.playerState === 2 && this.isAdvancing === true) ||
          this.playerState === 3)
      );
    },
  ),

  currentPositionIsSet: computed(
    'currentMediaModelID',
    'model.id',
    'currentPosition',
    function () {
      // if the audio from this model is currently being handled by the player
      // and the current position is greater than zero
        // return true
      // else
        // return false
      return (
        this.currentMediaModelID &&
        this.currentMediaModelID === this.model.id &&
        this.currentPosition > 0
      );
    },
  ),

  currentPositionInTime: computed('currentPosition', function () {
    var time;
    if (this.currentPosition >= 0) {
      time = this.audioPlayer.humanReadableTime(this.currentPosition);
    } else {
      time = '0:00';
    }
    return time;
  }),

  durationInTime: computed('duration', function () {
    return this.audioPlayer.humanReadableTime(this.duration);
  }),

  actions: {
    /* 
     * play()
     *
     * Press play
     */
    play() {
      // If loading is true
        // return false
      if (this.loading === true) {
        return false;
      }
      // If not loading play the audio.  
      this.audioPlayer.play(this.url, this.model);
    },
    /* 
     * pause()
     *
     * Press pause
     */
    pause() {
      // If loading is true
        // return false
      if (this.loading === true) {
        return false;
      }
      // If not loading pause the audio.
      this.audioPlayer.pause();
    },
    /* 
     * seekTo()
     *
     * Press pause
     */
    seekTo(event) {
      // Get position in milliseconds
      let position = event.target.value * 1000;
      // If loading is true
        // return false
      if (this.loading === true) {
        return false;
      }
      // If not seek the audio file to the given position.  
      this.audioPlayer.seekTo(position);
    },
    /* 
     * seekForward15s()
     *
     * Skip the audio forward 15 seconds.  
     */
    seekForward15s() {
      // If loading is true
        // return false
      if (this.loading === true) {
        return false;
      }
      // If not seek the audio forward 15 seconds.  
      this.audioPlayer.seekTo((this.currentPosition + 15) * 1000);
    },
    /* 
     * seekBack15s()
     *
     * Skip the audio backwards 15 seconds.  
     */
    seekBack15s() {
      // If loading is true
        // return false
      if (this.loading === true) {
        return false;
      }
      // If not seek the audio back 15 seconds.  
      this.audioPlayer.seekTo((this.currentPosition - 15) * 1000);
    },
  },
});
