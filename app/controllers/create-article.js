/* 
Create Article Controller

Used for when creating articles to be submitted to the Community Noticeboard (People's Gallery)
*/

import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import config from 'boma/config/environment';
import { computed } from '@ember/object';
import { validator, buildValidations } from 'ember-cp-validations';
import { alias } from '@ember/object/computed';
import $ from 'jquery';
import GoToRouteMixin from '../mixins/go-to-route';

/*
 * Validations
 *
 * This is the configuration for ember-cp-validators (https://github.com/adopted-ember-addons/ember-cp-validations)
 *
 * It ensures valid data is provided.  Where data is invalid error messages are shown to the user and they are prevented from
 * navigating forward to the next form pane.
 *
 */
const Validations = buildValidations({
  'article.tag': validator('presence', {
    presence: true,
    message: "Oops, you didn't select a tag!",
  }),
  'article.external_link': validator('format', {
    regex:
      /[a-zA-Z0-9][a-zA-Z-0-9]*(\.[\w-]+)+([\w.,@?^=%&amp;:/~+#-{}]*[\w@?^=%&amp;/~+#-{}])??/,
    message: "Sorry, this link isn't valid",
    allowBlank: true,
  }),
  'article.content': validator('length', {
    max: 240,
  }),
});

export default Controller.extend(GoToRouteMixin, Validations, {
  // Include the form service
  formService: service('form'),
  // get the API endpoint from config
  apiEndpoint: config.apiEndpoint,
  // get the festivalId from the pouchdb service
  pouchDb: service('pouch-db'),
  festivalId: alias('pouchDb.currentFestivalID'),

  // Loading states
  loading: false,
  tag: null,

  /*
   *
   * Publisher token holders are allowed to bypass the moderation process for submissions (their submissions are published by default)
   *
   * This is used to show them an alert to remind them of this before they make submissions.
   *
   */
  is_publisher: computed('model.tokens', function () {
    var publisherToken = this.model.tokens.filter((token) => {
      if (token.tokentype_id === 3) {
        return token;
      }
    });

    if (publisherToken.length > 0) {
      return true;
    }
    return false;
  }),

  // Setup the form panes so that the appropriate breadcrumb is created
  currentPaneIndex: alias('formService.currentPaneIndex'),
  // eslint-disable-next-line ember/avoid-leaking-state-in-ember-objects
  formPanes: ['select-tag', 'image', 'external-link', 'confirm-and-submit'],

  // initialise the cropper object
  cropper: null,
  // Use photo as the default imageType (could also be 'background') which uses the fabricjs image editor
  imageType: 'photo',
  fabricjs: null,

  /*
   * resetForm()
   *
   * Resets all form attributes to their defaults
   */
  resetForm() {
    this.setProperties({
      article: {
        tag: null,
        external_link: null,
        content: null,
        filename: null,
        filetype: null,
        image_base64: null,
        article_type: 'community_article',
      },
      image_base64: null,
      formSubmitted: null,
      selectedTag: null,
      imageType: 'photo',
    });

    this.formService.resetForm();
  },

  /*
   * selectedTag()
   *
   * tag    The ember data object for the tag     EmberObject
   *
   * Sets the selectedTag and article.tag for the chosen tag
   */
  setTag(tag) {
    this.set('selectedTag', tag);
    this.set('article.tag', tag.id);
  },

  // The default text used for the Submit Form button
  submitButtonText: 'Submit',

  actions: {
    /*
     * createArticle()
     *
     * send the request to the server to create the article, handle errors.
     */
    createArticle() {
      var self = this;

      this.set('article.festival_id', this.festivalId);
      this.set('article.wallet_address', this.model.wallet.address);
      this.set('loading', true);

      $.ajax(this.apiEndpoint + 'articles', {
        method: 'POST',
        data: this.article,
      })
        .then(() => {
          this.set('loading', false);
          self.set('formSubmitted', true);
          self.set('serverErrors', null);
        })
        .catch((response) => {
          this.set('loading', false);
          if (response.responseJSON !== undefined) {
            self.set('submitButtonText', 'Retry');
            self.set('serverErrors', response.responseJSON.errors);
          } else {
            self.set('submitButtonText', 'Retry');
            self.set('serverErrors', {
              base: ['Oops, there was a problem with your network, try again.'],
            });
          }
        });
    },

    /*
     * resetForm()
     *
     * re-initialise the form ready for another submission.
     */
    resetForm() {
      this.resetForm();
    },

    /*
     * setTag()
     *
     * tag      The ember data object of the tag to set     EmberObject
     *
     * the action to set the tag.
     */
    setTag(tag) {
      this.setTag(tag);
    },

    /*---------- FORM NAVIGATION ACTIONS ----------*/

    /*
     * registerFormElement
     *
     * Used to register each form pane with the form service.  This allows the form service to manage the navigation between form panes
     * and to set the active element in the breadcrumb.
     *
     * id     The id of the form Pane     String
     */
    registerFormElement(id) {
      this.formService.registerFormElement(id);
    },
    /*
     * next()
     *
     * Proceed to the next form pane
     */
    next() {
      this.formService.next(this);
    },
    /*
     * prev()
     *
     * Go back to the previous form pane
     */
    prev() {
      this.formService.prev();
    },
    /*
     * goTo(id)
     *
     * id       the id of the form pane to navigate to      string
     *
     * Go back to the previous form pane
     */
    goTo(id) {
      this.formService.goTo(id);
    },
    /*
     * validateThenNext(attrs)
     *
     * attrs       the object that needs to pass validation      EmberObject
     *
     * validate the object passed and, if valid progress to the next form pane
     */
    validateThenNext(attrs) {
      this.formService
        .validateThenNext(attrs.trim().split(','), this)
        .then((errors) => {
          this.set('errors', errors);
        });
    },
    /*
     * cropAndNext()
     *
     * validate the object passed and, if valid progress to the next form pane
     */
    cropAndNext() {
      var image_base64;
      if (this.imageType === 'photo') {
        image_base64 = this.formService.getCroppedCanvas(this.cropper);
      } else if (this.imageType === 'background') {
        this.set('article.filetype', 'image/jpeg');
        image_base64 = this.formService.getFabricJSCanvas(this.fabricjs);
      }
      this.set('article.image_base64', image_base64);
      this.formService.next(this);
    },
  },
});
