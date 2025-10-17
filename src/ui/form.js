import Panel from './panel.js';
import {UiEventType} from '../events/uieventtype.js';
import {replaceNode, splitScripts} from '../dom/utils.js';
import {isDefAndNotNull, whatType} from 'badu';
import {EV} from '../events/mouseandtouchevents.js';


/** @typedef {{
*     href: (string|undefined),
*     success: (boolean|undefined),
*     pk: (string|undefined),
*     }}
 */
let ServerFormSuccessJsonType;

/**
 * A specialized Panel for handling forms with validation, submission interception,
 * and server response processing. Automatically intercepts form submissions to
 * enable AJAX-style form posting with validation and error handling.
 *
 * Field validation and error handling is integrated directly into FormPanel,
 * managing HTML5 constraint validation, error messages, and form field events.
 *
 * @extends {Panel}
 */
class FormPanel extends Panel {
  #form;
  #fMap;

  /**
   * Creates a new FormPanel instance.
   * @param {string=} uri Optional URI for fetching form content
   */
  constructor(uri) {
    super(uri);

    /**
     * @type {?HTMLFormElement}
     * @private
     */
    this.#form = null;

    /**
     * Map of form fields to their error message DOM elements
     * @type {!Map<HTMLInputElement, Element>}
     * @private
     */
    this.#fMap = new Map();

    // noinspection JSUnusedLocalSymbols
    /**
     * @type {function(!FormPanel, (string|!ServerFormSuccessJsonType)=): (?|null|Promise<?>)}
     */
    this.onSubmitSucFunc = (_panel, _opt_data) => null;

  }

  /**
   * Gets the form element managed by this panel.
   * @return {?HTMLFormElement} The form element, or null if not found
   */
  get formEl() {
    return this.#form;
  }

  /**
   * @inheritDoc
   * Called when the form panel enters the document. Identifies the form element
   * and sets up submission interception and field error handling.
   */
  enterDocument() {
    super.enterDocument();
    this.formIdElementToForm_();
  };


  /**
   * Internal method to identify the form element and set up interception.
   * @private
   */
  formIdElementToForm_() {
    this.#form = this.getFormFromId();
    this.interceptFormSubmit(this.#form);
    this.initFieldValidation_();
  };


  /**
   * @param {string=} string The id of the form we want to sterilise.
   * @return {?HTMLFormElement}
   */
  getFormFromId(string) {
    let form = null;
    let el = this.getElement().querySelector('form');
    if (string) {
      el = document.getElementById(/** @type {string} */(string)) || el;
    }
    if (el && el.tagName.toLowerCase() === 'form') {
      form = /** @type {HTMLFormElement} */ (el);
    }
    return form;
  };

  //--[ Field Validation Methods ]--
  /**
   * Initializes field validation. Sets up event listeners on the form
   * for change, input, and invalid events.
   * @private
   */
  initFieldValidation_() {
    if (this.#form) {
      this.listen(this.#form, EV.CHANGE, e => {
        this.validateOnChange_(e);
      }, {passive: true});

      this.listen(this.#form, EV.INPUT, e => {
        this.clearAllValidationErrors();
        this.validateOnChange_(e);
      });

      this.listen(this.#form, EV.INVALID, e => {
        e.preventDefault();
        const field = /** @type {HTMLInputElement} */ (e.target);
        this.clearAlertOnField_(field);
        this.displayFieldError(field);
      }, {passive: true});
    }
  }

  /**
   * Checks all form fields for validity. Returns true if all fields are valid.
   * Displays error messages for any invalid fields.
   * @return {boolean} True if all fields are valid, false otherwise
   */
  checkAllFields() {
    const arr = [...this.#form.elements]
      .map(e => [this.checkValidationForField_(e), e])
      .filter(e => !e[0]);
    arr.forEach(e => this.displayFieldError(e[1]));
    return arr.length === 0;
  }

  /**
   * Clear all existing validation errors
   */
  clearAllValidationErrors() {
    const fields = this.#form ? this.#form.elements : [];
    [...fields].forEach(field => this.clearAlertOnField_(field));

    const nonFieldErrs = this.#form.querySelectorAll('.non-field-errors');
    [...nonFieldErrs].forEach(e => e.classList.remove('alert-error'));
  }

  /**
   * Format the message dom object and insert it into the DOM
   * @param {HTMLInputElement} field The field after which the alert will be inserted.
   * @param {string} msg The message in the alert.
   * @param {string} _css A CSS class name to add to the alert div.
   * @private
   */
  displayAlert_(field, msg, _css) {
    const alertDom = document.getElementById(`${field.id}-helper-text`) ||
        document.createElement('p');
    alertDom.textContent = msg;
    this.#fMap.set(field, alertDom);
  }

  /**
   * Check validation for a single field
   * @param {HTMLInputElement} field
   * @return {boolean} True if field is valid
   * @private
   */
  checkValidationForField_(field) {
    this.clearAlertOnField_(field);
    let isValid = !field.willValidate;
    if (field.willValidate) {
      isValid = field.checkValidity();
    }
    return isValid;
  }

  /**
   * Clear alert for a single field
   * @param {HTMLInputElement} field
   * @private
   */
  clearAlertOnField_(field) {
    field.classList.remove('error');
    if (this.#fMap.has(field)) {
      this.#fMap.get(field).textContent = '';
    }
    this.#fMap.delete(field);
  }

  /**
   * Display the given error message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string=} opt_msg
   */
  displayFieldError(field, opt_msg) {
    const message = opt_msg || field.validationMessage;
    field.classList.add('error');
    this.displayAlert_(field, message, 'alert-error');
  }

  /**
   * Display the given success message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string} message
   */
  displayFieldSuccess(field, message) {
    this.displayAlert_(field, message, 'alert-success');
  }

  /**
   * Display the given information message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string} message
   */
  displayFieldInfo(field, message) {
    this.displayAlert_(field, message, 'alert-info');
  }

  /**
   * Validate field on change event
   * @param {Event} e
   * @private
   */
  validateOnChange_(e) {
    this.checkValidationForField_(/** @type {HTMLInputElement} */ (e.target));
  }

  /**
   * Given a form id, get the form, and intercept and sterilise its submit.
   * Forms that passed through here will not be able to be submitted with a
   * normal submit button anymore, but built in HTML5 Constraint Validation
   * will still function on the form. This way, we can still have a button with
   * type="submit", which will trigger the validation, and we can submit
   * valid forms with xhrio which allows us to add callbacks to them.
   *
   * @param {?HTMLFormElement} form The form we want to sterilise.
   * @return {?HTMLFormElement}
   */
  interceptFormSubmit(form) {
    if (form) {
      form.noValidate = true;
      const user = this.user;
      this.listen(form, EV.SUBMIT, e => {
        e.preventDefault();
        this.debugMe('Intercepted from SUBMIT');
        if (this.checkAllFields()) {
          user && user.formSubmit(this);
        }
      });
    }
    return form;
  };


  //--[ Round Trip ]--
  /**
   * @param {function(!FormPanel, (string|!ServerFormSuccessJsonType)=): (?|null|Promise<?>)} func
   */
  onSubmitSuccess(func) {
    this.onSubmitSucFunc = func;
  };

  /**
   * Given a 'fetch' reply, replace the form.
   * This simply replaced the form element with what came back from the server
   * and re-reads the scripts.
   * @param {string} reply
   */
  replaceForm(reply) {

    this.responseObject = splitScripts(reply);
    if (this.responseObject.html) {
      if (this.redirected) {
        // Replace the whole innards of the panel.
        this.removeAllListener();
        const el = this.getElement();
        const parent = el.parentNode;
        this.setElementInternal_(this.responseObject.html);
        parent.replaceChild(this.getElement(), el);
      } else {
        // Just replace the form component.
        const newForm = /** @type {!Element} */ (this.responseObject.html)
          .querySelector('form');
        if (newForm) {
          replaceNode(newForm, this.#form);
        }

        // Forms have randomIDs so the submit button must come along...
        // Sadly :(
        const newSubmit = /** @type {!Element} */ (this.responseObject.html)
          .querySelector('button[type="submit"]');
        const oldSubmit = /** @type {!Element} */ (this.getElement())
          .querySelector('button[type="submit"]');
        if (newSubmit && oldSubmit) {
          replaceNode(newSubmit, oldSubmit);
        }


      }
      this.enterDocument();
    }
  };


  /**
   * Expects HTML data from a call to the back.
   * @return {Promise} Returns a promise with this panel as value.
   */
  refreshFromFromServer() {
    const usr = this.user;
    const uri = this.uri;
    if (usr) {
      return usr.fetch(uri, this.abortController.signal).then(
        s => this.replaceForm(s));
    } else {
      return Promise.reject(new Error('No UserManager instance available for FormPanel.refreshFromFromServer()'));
    }
  };

  /**
   * @param {string} reply
   * @return {Promise}
   */
  processSubmitReply(reply) {

    this.clearAllValidationErrors();
    let success = false;

    if (whatType(reply) === 'object' && reply['success']) {
      return Promise.resolve(this).then(() => {
        this.onSubmitSucFunc(this, reply);
        this.dispatchCompEvent(UiEventType.FORM_SUBMIT_SUCCESS);
      });
    }
    else if (reply === 'success') {
      this.debugMe(`
      1.REDIRECTED: ${this.redirected}
      REPLY: ${reply}`);
      // We are done.
      // Nothing further to do here.
      success = true;
    } else if (reply === 'redirected_success\n') {
      this.debugMe(`
      2.REDIRECTED: ${this.redirected}
      REPLY: ${reply}`);
      // Indicate that we were redirected, but are done.
      // Nothing further to do here. Set the 'redirected' flag to false,
      // and we will fall through to the correct response below.
      success = true;
      this.redirected = false;
    } else {
      this.debugMe(`
      3.REDIRECTED: ${this.redirected}
      REPLY: Some form HTML`);
      // We received something other than a simple "we are done".
      // Replace the form (there may be server side error messages in it)
      // and look for the error objects.
      // Our success depends on finding error objects.
      this.replaceForm(reply);

      // We may not actually have a form element left after a redirect.
      let hasErrors = [];
      if (isDefAndNotNull(this.#form)) {
        hasErrors = this.#form.querySelectorAll('.alert-error');
      }
      success = !hasErrors.length;
    }

    if (success && this.redirected) {
      this.debugMe(`
      4.REDIRECTED: ${this.redirected}
      SUCCESS: ${success}`);
      // Just return the promise - we are not done yet.
      this.redirected = false;
      return Promise.resolve(this);
    } else if (success) {
      this.debugMe(`
      5.REDIRECTED: ${this.redirected}
      SUCCESS: ${success}`);
      // We are done. Execute any 'onSuccess' directives, and
      // then fire the 'FORM_SUBMIT_SUCCESS' event.
      return Promise.resolve(this).then(() => {
        this.onSubmitSucFunc(this);
        this.dispatchCompEvent(UiEventType.FORM_SUBMIT_SUCCESS);
      });
    } else {
      this.debugMe(`
      6.REDIRECTED: ${this.redirected}
      SUCCESS: ${success}`);
      // 'success' flag is not set. The form probably has errors.
      // Reject the promise.
      const errorCount = this.#form?.querySelectorAll('.alert-error').length || 0;
      return Promise.reject(new Error(`Form validation failed: ${errorCount} error(s) found`));
    }
  };
}

export default FormPanel;
