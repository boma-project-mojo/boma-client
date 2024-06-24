import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  /* 
   * selectedAnswer
   * 
   * Return the selected answer if there is a request to respond
   * to this survey which has still yet to be fulfilled (e.g because of poor network)
   */
  selectedAnswer: computed(
    'pendingRequest.postData.questions.length',
    'question.id',
    function () {
      var existingQuestionResponse;
      // If there is a pendingRequest and the request includes
      // responses.  
        // Check whether the pending request includes a response to this question
      if (
        this.pendingRequest &&
        this.pendingRequest.postData.questions.length > 0
      ) {
        existingQuestionResponse = this.pendingRequest.postData.questions.find(
          (element) => element.id === this.question.id,
        );
      }
      // If there is a existing response to this question 
        // return it
      // else
        // return null
      if(existingQuestionResponse){
        return existingQuestionResponse.answer_id;
      }else{
        return null;
      }
    },
  ),

  /* 
   * errors
   * 
   * Returns errors is there are any to show.  
   */
  errors: computed(
    'pendingRequest.requestErrors.errors.questions',
    'question.id',
    function () {
      var errors;
      // If there is a unfulfilled pending request and the request has failed because of 
      // errors
        // see if there are any errors that relate to this question.  
      if (
        this.pendingRequest &&
        this.pendingRequest.requestErrors &&
        this.pendingRequest.requestErrors.errors.questions
      ) {
        errors = this.pendingRequest.requestErrors.errors.questions.find(
          (element) => parseInt(element.id) === this.question.id,
        );
      }
      // if there are errors
        // return them
      // else
        // return null
      if(errors){
        return errors.errors;
      }else{
        return null;
      }
    },
  ),
  /* 
   * isDisabled
   *
   * Users can't change their selected answer if there is a pending request which still
   * hasn't been fulfilled.  
   * 
   * If there is a pending request and a selected answer then the input should be 
   * disabled.
   */
  isDisabled: computed('pendingRequest', 'selectedAnswer', function () {
    return this.selectedAnswer != null;
  }),
});
