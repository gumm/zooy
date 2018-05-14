import {getPath} from '../uri/uri.js';
import {handleTemplateProm} from '../dom/utils.js'
import {stripLeadingChar} from '../../node_modules/badu/src/badu.js';

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
    return Promise.reject(new Error(
        `${response.url} ${response.status} (${response.statusText})`));
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
      err => Promise.reject(`Could not get JSON from response: ${err}`));
};


/**
 * @param {Response} response
 * @return {Promise}
 */
const getText = response => {
  return response.text().then(
      text => Promise.resolve(text),
      err => Promise.reject(`Could not get text from response: ${err}`));
};


/**
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @param {string} method One of PATCH, PUT, POST etc.
 * @return {!RequestInit}
 */
const jsonInit = (jwt, obj, method = 'POST') => {
  const h = new Headers();
  h.append('Content-type', 'application/json');
  h.append('X-Requested-With', 'XMLHttpRequest');
  jwt && jwt !== '' && h.append('Authorization', `bearer ${jwt}`);
  return {
    cache: 'no-cache',
    method: method,
    headers: h,
    credentials: 'include',
    body: JSON.stringify(obj),
  };
};

/**
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @return {Object}
 */
const jsonPostInit = (jwt, obj) => jsonInit(jwt, obj, 'POST');

/**
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @return {!RequestInit}
 */
const jsonPatchInit = (jwt, obj) => jsonInit(jwt, obj, 'PATCH');

/**
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @return {!RequestInit}
 */
const jsonPutInit = (jwt, obj) => jsonInit(jwt, obj, 'PUT');


/**
 * @param {string} method PUT, POST, PATCH
 * @param {string} jwt A JWT token
 * @param {boolean} useDocumentCookies If set to true, we look for cookies
 *    in the document. In almost all cases where we are posting a form, this
 *    should be 'false' as the form itself carries the CSRF token.
 *    In cases where we are using AJAX, we need to grab the cookie from
 *    the document, so set this to 'true'
 * @return {!RequestInit}
 */
const basicPutPostPatchInit = (method, jwt, useDocumentCookies = false) => {
  const h = new Headers();
  jwt && jwt !== '' && h.append('Authorization', `bearer ${jwt}`);
  h.append('X-Requested-With', 'XMLHttpRequest');
  if (useDocumentCookies) {
    const token = getCookieByName('csrftoken');
    token && useDocumentCookies && h.append('X-CSRFToken', token);
  }
  return {
    cache: 'no-cache',
    method: method,
    headers: h,
    redirect: 'follow',  // This is anyway the default.
    credentials: 'include'
  };
};


/**
 * @param {string} jwt A JWT token
 * @param {boolean} useDocumentCookies
 * @return {!RequestInit}
 */
const basicPostInit = (jwt, useDocumentCookies = true) =>
    basicPutPostPatchInit('POST', jwt, useDocumentCookies);


/**
 * @param {string} jwt A JWT token
 * @param {boolean} useDocumentCookies
 * @return {!RequestInit}
 */
const basicPutInit = (jwt, useDocumentCookies = true) =>
    basicPutPostPatchInit('PUT', jwt, useDocumentCookies);


/**
 * @param {string} jwt A JWT token
 * @param {boolean} useDocumentCookies
 * @return {!RequestInit}
 */
const basicPatchInit = (jwt, useDocumentCookies = true) =>
    basicPutPostPatchInit('PATCH', jwt, useDocumentCookies);


/**
 * @param {string} jwt A JWT token
 * @param {FormPanel} formPanel
 * @return {!RequestInit}
 */
const formPostInit = (jwt, formPanel) => {
  const useDocumentCookies = false;
  const resp = basicPostInit(jwt, useDocumentCookies);
  resp['body'] = new FormData(formPanel.formEl);
  return resp;
};


/**
 * @param {string} jwt A JWT token
 * @return {!RequestInit}
 */
const basicGetInit = jwt => {
  const h = new Headers();
  h.append('Authorization', `bearer ${jwt}`);
  h.append('X-Requested-With', 'XMLHttpRequest');
  return {
    cache: 'no-cache',
    headers: h,
    credentials: 'include'
  };
};


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

    // /**
    //  * @type {Request}
    //  */
    // this.JWTTokenRequest = new Request('/api/v3/tokens/login/');


    // /**
    //  * @type {Request}
    //  */
    // this.loginRequest = new Request('/accounts/login/');

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
  updateProfileFromJwt(data, opt_onlyIfNoneExists=false) {
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
    return startSpin()
        .then(() => fetch(req, formPostInit(this.jwt, formPanel)))
        .then(checkStatusTwo(formPanel))
        .then(stopSpin)
        .then(getText)
        .then(processSubmitReply)
        .catch(err => {
          stopSpin('');
          console.error('Form submit error', err)
        });
  };


  /**
   * @param {string} uri
   * @return {Promise}
   */
  putPostPatchNobody(uri, init) {
    const req = new Request(uri);
    return fetch(req, init)
        .then(checkStatus)
        .then(getText)
        .catch(err => console.error('Form submit error', err));
  };


  /**
   * @param {string} uri
   * @return {Promise}
   */
  putNoBody(uri) {
    return this.putPostPatchNobody(uri, basicPutInit(''))
  };

  /**
   * @param {string} uri
   * @return {Promise}
   */
  fetch(uri) {
    const req = new Request(uri.toString());
    return startSpin()
        .then(() => fetch(req, basicGetInit(this.jwt)))
        .then(checkStatus)
        .then(stopSpin)
        .then(getText)
        .catch(err => {
          stopSpin('');
          console.error('UMan Text GET Fetch:', err)
        });
  };

  /**
   * Use this if you want to directly get a parsed template that does not go
   * through panel logic.
   * @param {string} uri
   * @return {Promise}
   */
  fetchAndSplit(uri) {
    return this.fetch(uri).then(handleTemplateProm)
  };

  /**
   * @param {string} uri
   * @return {Promise}
   */
  fetchJson(uri) {
    const req = new Request(uri.toString());
    return startSpin()
        .then(() => fetch(req, basicGetInit(this.jwt)))
        .then(checkStatus)
        .then(stopSpin)
        .then(getJson)
        .catch(err => {
          stopSpin('');
          console.error('UMan JSON GET Fetch:', err)
        });
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @return {Promise}
   */
  patchJson(uri, payload) {
    const req = new Request(uri.toString());
    return fetch(req, jsonPatchInit(this.jwt, payload))
        .then(checkStatus)
        .then(getJson)
        .catch(err => console.error('UMan JSON PATCH Fetch:', err));
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @return {Promise}
   */
  postJson(uri, payload) {
    const req = new Request(uri.toString());
    return fetch(req, jsonPostInit(this.jwt, payload))
        .then(checkStatus)
        .then(getJson)
        .catch(err => console.error('UMan JSON POST Fetch:', err));
  };
}
