import {getPath} from '../uri/uri.js';
import {handleTemplateProm} from '../dom/utils.js'
import {stripLeadingChar, identity} from 'badu';

const stripLeadingSpace = stripLeadingChar(' ');
const stripLeadingSlash = stripLeadingChar('/');
const getCookieByName = name => document.cookie.split(';')
    .map(v => v.split('='))
    .reduce((p, c) => p.set(stripLeadingSpace(c[0]), c[1]), new Map())
    .get(name);

/**
 * The spinner should not be started or stopped by fetch calls while there
 * are other longer fetch calls in flight. To do that, we create a spinner
 * that only acts when it changes to and from 0
 * @return {function(number)}
 */
const spinner = id => {
  /**
   * @type {number}
   */
  let wrapped = 0;

  /**
   * {?Element|undefined}
   */
  let e;

  /**
   * @param {number} v
   * @return {boolean}
   */
  const change = v => {
    const inc = v > 0;
    inc ? wrapped += 1 : wrapped -= 1;
    return inc ? wrapped === 1 : wrapped === 0;
  };

  return val => {
    e = e || document.getElementById(id);
    e && change(val) && e.classList.toggle('viz', wrapped > 0);
  };
};

const spin = spinner('the_loader');
const startSpin = () => Promise.resolve(spin(1));
const stopSpin = x => {
  spin(0);
  return Promise.resolve(x);
};


/**
 * @param {Response} response
 * @return {!Promise<?>}
 */
const checkStatus = response => {
  if (response.ok) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(`${response.url} ${response.status} (${response.statusText})`));
  }
};


/**
 * @param {Panel} panel
 * @return {function(!Response): !Promise<?>}
 */
const checkStatusTwo = panel => response => {

  const panelUri = stripLeadingSlash(getPath(panel.uri).toString());
  const responseUri = stripLeadingSlash(getPath(response.url));
  const isRedirected = panelUri !== responseUri;

  panel.setIsRedirected(isRedirected, responseUri);
  return checkStatus(response);
};


/**
 * @param {Response} response
 * @return {Promise}
 */
const getJson = response => {
  return response.json().then(
      data => Promise.resolve(data),
      err => Promise.reject(`Could not get JSON from response: ${err}`)
  );
};


/**
 * @param {Response} response
 * @return {Promise}
 */
const getText = response => {
  return response.text().then(
      text => Promise.resolve(text),
      err => Promise.reject(`Could not get text from response: ${err}`)
  );
};


/**
 * @param {Response} response
 * @return {Promise}
 */
const getTextOrJson = response => {
  const contentType = response.headers.get('Content-Type');
  if (contentType === 'application/json') {
    return getJson(response)
  } else {
    return getText(response)
  }
};


/**
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @param {string} method One of PATCH, PUT, POST etc.
 * @param {AbortSignal|undefined} signal
 * @return {!RequestInit}
 */
const jsonInit = (
    jwt, obj, method = 'POST',
    signal = void 0) => {

  const h = new Headers();
  h.append('Content-type', 'application/json');
  h.append('X-Requested-With', 'XMLHttpRequest');
  jwt && jwt !== '' && h.append('Authorization', `bearer ${jwt}`);
  const options = {
    cache: 'no-cache',
    method: method,
    headers: h,
    credentials: 'include',
    body: JSON.stringify(obj),
  };
  if (signal) {
    options.signal = signal;
  }
  return options;
};

/**
 * @param {string} method PUT, POST, PATCH
 * @param {string} jwt A JWT token
 * @param {boolean} useDocumentCookies If set to true, we look for cookies
 *    in the document. In almost all cases where we are posting a form, this
 *    should be 'false' as the form itself carries the CSRF token.
 *    In cases where we are using AJAX, we need to grab the cookie from
 *    the document, so set this to 'true'
 * @param {AbortSignal|undefined} signal
 * @return {!RequestInit}
 */
const basicPutPostPatchInit = (
    method, jwt, useDocumentCookies = false,
    signal = void 0) => {

  const h = new Headers();
  jwt && jwt !== '' && h.append('Authorization', `bearer ${jwt}`);
  h.append('X-Requested-With', 'XMLHttpRequest');
  if (useDocumentCookies) {
    const token = getCookieByName('csrftoken');
    token && useDocumentCookies && h.append('X-CSRFToken', token);
  }
  const options = {
    cache: 'no-cache',
    method: method,
    headers: h,
    redirect: 'follow',  // This is anyway the default.
    credentials: 'include'
  };
  if (signal) {
    options.signal = signal;
  }
  return options;
};


/**
 * @param {string} jwt A JWT token
 * @param {FormPanel} formPanel
 * @param {AbortSignal|undefined} signal
 * @return {!RequestInit}
 */
const formPostInit = (jwt, formPanel, signal = void 0) => {
  const useDocumentCookies = false;
  const resp = basicPutPostPatchInit('POST', jwt, useDocumentCookies, signal);
  resp['body'] = new FormData(formPanel.formEl);
  return resp;
};


/**
 * @param {string} jwt A JWT token
 * @param {AbortSignal|undefined} signal
 * @return {!RequestInit}
 */
const basicGetInit = (jwt, signal = void 0) => {
  const h = new Headers();
  h.append('Authorization', `bearer ${jwt}`);
  h.append('X-Requested-With', 'XMLHttpRequest');
  const options = {
    cache: 'no-cache', headers: h, credentials: 'include'
  };
  if (signal) {
    options.signal = signal;
  }
  return options
};


/**
 * @param {string} uri
 * @param {Object} init
 * @return {Promise}
 */
const putPostPatchNobody = (uri, init) => {
  const req = new Request(uri);
  return fetch(req, init)
      .then(checkStatus)
      .then(getText);
};

/**
 * @param {string} debugString
 * @param {*} returnValue
 * @returns {function(*): *}
 */
const genCatchClause = (debugString, returnValue = void 0) => err => {
  stopSpin('').then(identity);
  if (err.name === 'AbortError') {
    console.log(debugString, 'ABORTED!');
  } else {
    console.log(debugString, err);
  }
  return returnValue;
}


/** @typedef {{
 *     first_name: (string|undefined),
 *     last_name: (string|undefined),
 *     email: (string|undefined),
 *     username: (string|undefined),
 *     id: (number|undefined),
 *     is_active: (boolean|undefined),
 *     is_staff: (boolean|undefined),
 *     is_superuser: (boolean|undefined)
 *     }}
 */
let UserLikeType;


/**
 * A class to manage the setting and getting of permissions.
 */
export default class UserManager {


  /**
   * @param {!Object=} opt_data
   */
  constructor(opt_data) {
    /**
     * @type {UserLikeType}
     * @private
     */
    this.user_ = {};

    /**
     * @type {string}
     * @private
     */
    this.jwt = '';

    if (opt_data) {
      this.updateProfileFromJwt(opt_data).then(() => {
      });
    }
  };


  /**
   * @param {Object} data
   * @param {boolean=} opt_onlyIfNoneExists
   * @return {Promise}
   * @private
   */
  updateProfileFromJwt(data, opt_onlyIfNoneExists = false) {
    if (opt_onlyIfNoneExists && this.jwt !== '') {
      return Promise.resolve('User Profile Already exists');
    }
    if (data['non_field_errors']) {
      return Promise.reject(new Error(`JWT ${data['non_field_errors']}`));
    } else {
      this.updateToken(data['token']);
      this.updateProfile(data['user']);
      return Promise.resolve('User Profile Updated');
    }
  };


  /**
   * @param {UserLikeType} data
   */
  updateProfile(data) {
    this.user_ = data;
  };


  /**
   * @param {string} t
   */
  updateToken(t) {
    this.jwt = t;
  };


  /**
   * @return {number|undefined}
   */
  get id() {
    return this.user_['id'];
  };


  /**
   * @return {string|undefined}
   */
  get name() {
    return this.user_['name'];
  };


  /**
   * @return {string|undefined}
   */
  get surname() {
    return this.user_['surname'];
  };


  /**
   * @return {string|undefined}
   */
  get salutation() {
    let salutation = this.name;
    const surname = this.surname;
    if (surname) {
      salutation = salutation + ' ' + surname;
    }
    return salutation;
  };


  /**
   * @param {FormPanel} formPanel
   * @return {Promise}
   */
  formSubmit(formPanel) {
    const req = new Request(formPanel.uri.toString());
    const processSubmitReply = formPanel.processSubmitReply.bind(formPanel);
    const catchClause = genCatchClause('Form submit error');
    return startSpin()
        .then(() => fetch(req, formPostInit(
            this.jwt, formPanel, formPanel.abortController.signal)))
        .then(checkStatusTwo(formPanel))
        .then(stopSpin)
        .then(getTextOrJson)
        .then(processSubmitReply)
        .catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {Boolean} useDocumentCookies
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  putNoBody(uri, signal = void 0, useDocumentCookies = false,) {
    const catchClause = genCatchClause('putNobody error');
    const opts = basicPutPostPatchInit(
        'PUT', this.jwt, useDocumentCookies, signal)
    return putPostPatchNobody(uri, opts)
        .catch(catchClause)
  };

  /**
   * @param {string} uri
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  fetch(uri, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`UMan Text GET Fetch: ${uri}`);
    return startSpin()
        .then(() => fetch(req, basicGetInit(this.jwt, signal)))
        .then(checkStatus)
        .then(stopSpin)
        .then(getText)
        .catch(catchClause);
  };

  /**
   * Use this if you want to directly get a parsed template that does not go
   * through panel logic.
   * @param {string} uri
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  fetchAndSplit(uri, signal = void 0) {
    const catchClause = genCatchClause(`fetchAndSplit: ${uri}`);
    return this.fetch(uri, signal).then(handleTemplateProm).catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  fetchJson(uri, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`fetchJson: ${uri}`, {});
    const opts = basicGetInit(this.jwt, signal);
    return startSpin()
        .then(() => fetch(req, opts))
        .then(checkStatus)
        .then(stopSpin)
        .then(getJson)
        .catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  patchJson(uri, payload, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`patchJson: ${uri}`);
    const opts = jsonInit(this.jwt, payload, 'PATCH', signal);
    return fetch(req, opts)
        .then(checkStatus)
        .then(getJson)
        .catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  postJson(uri, payload, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`postJson: ${uri}`);
    const opts = jsonInit(this.jwt, payload, 'POST', signal);
    return fetch(req, opts)
        .then(checkStatus)
        .then(getJson)
        .catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  putJson(uri, payload, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`putJson: ${uri}`);
    const opts = jsonInit(this.jwt, payload, 'PUT', signal);
    return fetch(req, opts)
        .then(checkStatus)
        .then(getJson)
        .catch(catchClause);
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  delJson(uri, payload, signal = void 0) {
    const req = new Request(uri.toString());
    const catchClause = genCatchClause(`delJson: ${uri}`);
    const opts = jsonInit(this.jwt, payload, 'DELETE', signal);
    return fetch(req, opts)
        .then(checkStatus)
        .then(getJson)
        .catch(catchClause);
  };
}
