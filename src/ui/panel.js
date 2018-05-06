import Component from './component.js';
import { evalScripts, splitScripts } from "../dom/utils.js";
import UserManager from '../user/usermanager.js';


class Panel extends Component {

  static makeUser(data)  {
    return new UserManager(data);
  };

  
  constructor(uri) {
    super();
    
    this.uri_ = uri;

    // Script are evaluated in the context of the panel.
    this.evalScripts = evalScripts(this);

    /**
     * Set to true if we can detect that the response from the fetch was
     * redirected. Useful form managing form redirects.
     * @type {boolean}
     */
    this.redirected = false;

    /**
     * @type {{html:?Element, scripts:?NodeList}}
     */
    this.responseObject = {html: null, scripts: null};

    /**
     * @type {!UserManager}
     * @private
     */
    this.user_ = new UserManager();
  };

  //---------------------------------------------------[ Getters and Setters ]--
  get uri() {
    return this.uri_;
  }

  /**
   * @return {!UserManager}
   */
  get user() {
    return this.user_;
  }

  /**
   * @param {!UserManager} user
   */
  set user(user) {
    this.user_ = user;
  }


  //----------------------------------------------------------------------------
  /**
   * Expects HTML data from a call to the back.
   * @param {Function=} opt_callback An optional callback to call before rendering
   * the panel. This is useful for when you only want to attach the new panel to
   * the view right before you render it - meaning the existing panel stays in
   * place on the DOM for the duration of the fetch call.
   * @return {Promise} Returns a promise with this panel as value.
   */
  renderWithTemplate(opt_callback) {
    const usr = this.user;
    if (usr) {
      return usr.fetch(this.uri_).then(s => {
        if (opt_callback) {
          opt_callback();
        }
        this.onRenderWithTemplateReply(s)
      });
    } else {
      return Promise.reject('No user')
    }

  };

  /**
   * @param {string} s
   * @private
   * @return {Promise}
   */
  onRenderWithTemplateReply(s) {

    return new Promise(x => {
      this.responseObject = splitScripts(s);
      this.domFunc = () => /** @type {!Element} */ (this.responseObject.html);
      this.render();
      return x(this);
    })
  };

  enterDocument() {
    const panel = this.getElement();
    this.evalScripts(this.responseObject.scripts);

    super.enterDocument();
  }

  /**
   * @param {boolean} bool
   * @param {?string} url
   */
  setIsRedirected(bool, url) {
    this.redirected = bool;
    if (this.redirected && url) {
      this.uri_ = url;
    }
  };

}


export default Panel;
