import Component from './component.js';
import { evalScripts, splitScripts, getElDataMap, enableClass } from '../dom/utils.js';
import { isDefAndNotNull, toUpperCase } from '../../node_modules/badu/src/badu.js';
import UserManager from '../user/usermanager.js';
import {UiEventType} from '../events/uieventtype.js';
import ZooyEventData from '../events/zooyeventdata.js';
import EVT from './evt.js';


class Panel extends Component {

  static panelEventCode() {
    return UiEventType.PANEL;
  }

  static compReadyCode() {
    return UiEventType.READY;
  }

  
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
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;
  };

  //---------------------------------------------------[ Getters and Setters ]--
  get uri() {
    return this.uri_;
  }

  /**
   * @param {!UserManager} user
   */
  set user(user) {
    this.user_ = user;
  }

  /**
   * @return {!UserManager}
   */
  get user() {
    if (!this.user_) {
      this.user_ = new UserManager();
    }
    return this.user_;
  };


  //----------------------------------------------------[ Template Render ]-----
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
          opt_callback(this);
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

  //--------------------------------------------------------[ JSON Render ]-----
  /**
   * Equivalent to the @code{renderWithTemplate} method in that it is guaranteed
   * that a reply from the callback is received before @code{render} is called.
   * @param {function(Object, !Panel)} opt_callback The callback function
   *      that will receive the reply event.
   */
  renderWithJSON(opt_callback) {
    const usr = this.user;
    if (usr) {
      return this.user.fetchJson(this.uri_).then(json => {
        if (opt_callback) {
          opt_callback(json, this);
        }
        this.onRenderWithJSON(json)
      });
    } else {
      return Promise.reject('No user')
    }

  };


  /**
   * On reply from a GET call to the panel URI
   * @param {Object} json The callback function
   *      that will receive the reply event.
   * @return {Promise}
   */
  onRenderWithJSON(json) {
    return new Promise(x => {
      return x(this);
    })
  };


  /**
   * @param {string} zCode
   * @param {Object} json
   */
  onAsyncJsonReply(zCode, json) {
    // Stub
  };

  //--------------------------------------------------------[ JSON Render ]-----
  enterDocument() {

    const panel = this.getElement();
    this.evalScripts(this.responseObject.scripts);

    // If we are in an environment where MDC is used.
    if (isDefAndNotNull(window.mdc) && window.mdc.hasOwnProperty('autoInit')) {
      // noinspection JSCheckFunctionSignatures
      [...panel.querySelectorAll('.mdc-button'),
        ...panel.querySelectorAll('.mdc-ripple-surface'),
        ...panel.querySelectorAll('.mdc-fab')].forEach(
            mdc.ripple.MDCRipple.attachTo);

      [...panel.querySelectorAll('.mdc-icon-button')].forEach(el => {
        const b = new mdc.ripple.MDCRipple(el);
        b.unbounded = true;
        if (el.hasAttribute('data-toggle-on-content') &&
            el.hasAttribute('data-toggle-off-content')) {
          mdc.iconButton.MDCIconButtonToggle.attachTo(el);
          this.listen(el, 'click', e => e.stopPropagation());
          this.listen(el, 'MDCIconButtonToggle:change', e => {
            e.stopPropagation();
            const trg = e.currentTarget;
            const isOn = e.detail['isOn'];
            const hrefAt = isOn ? '__on' : '__off';
            const hrefTog = trg.getAttribute(`data-href${hrefAt}`);
            this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
              orgEvt: e,
              trigger: trg,
              href: trg.href || trg.getAttribute('data-href'),
              hrefTog: hrefTog,
              isOn: isOn
            }, getElDataMap(trg)));
          });
        } else {
          this.listen(el, 'click', e => {
            e.stopPropagation();
            const trg = e.currentTarget;
            this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
              orgEvt: e,
              trigger: trg,
              href: trg.href || trg.getAttribute('data-href'),
            }, getElDataMap(trg)));
          });
        }
      });

      // noinspection JSCheckFunctionSignatures
      // [...panel.querySelectorAll('.mdc-icon-toggle')].forEach(
      //     mdc.iconButton.MDCIconToggle.attachTo
      // );

      // noinspection JSCheckFunctionSignatures
      [...panel.querySelectorAll('.mdc-text-field')].forEach(
          mdc.textField.MDCTextField.attachTo
      );

      // noinspection JSCheckFunctionSignatures
      [...panel.querySelectorAll('.mdc-select')].forEach(
          mdc.select.MDCSelect.attachTo
      );

      // noinspection JSCheckFunctionSignatures
      [...panel.querySelectorAll('.mdc-form-field')].forEach(
          mdc.formField.MDCFormField.attachTo
      );
      [...panel.querySelectorAll('.mdc-tab-bar')].forEach(
          mdc.tabs.MDCTabBar.attachTo
      );

      [...panel.querySelectorAll('.mdc-list')].forEach(el => {
        mdc.list.MDCList.attachTo(el);
        // Attach a ripple to the list items.
        [...el.querySelectorAll('li')].forEach(li => {
          mdc.ripple.MDCRipple.attachTo(li);
        });
        // this.listen(e, 'keydown', e => {console.log(e)})
      });
    }

    // Activate custom buttons
    // const tstZv = panel.querySelectorAll('.tst__zv');
    // const allBut = [...Array.from(tst), ...Array.from(tstZv)];
    [...panel.querySelectorAll('.tst__button')].forEach(el => {
      this.listen(el, 'click', e => {
        e.stopPropagation();
        const trg = e.currentTarget;
        this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
          orgEvt: e,
          trigger: trg,
          href: trg.href || trg.getAttribute('data-href'),
        }, getElDataMap(trg)));
      });
    });

    // [...panel.querySelectorAll('.mdc-icon-button')].forEach(el => {
      // this.listen(el, 'click', e => {
      //   e.stopPropagation();
      //   const trg = e.currentTarget;
      //   this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
      //     orgEvt: e,
      //     trigger: trg,
      //     href: trg.href || trg.getAttribute('data-href'),
      //   }, getElDataMap(trg)));
      // });
    // });

    // Activate toggle icons
    // We intercept the click on these as well, as we want to stop its
    // propagation.
    [...panel.querySelectorAll('.mdc-icon-toggle')].forEach(el => {
      this.listen(el, 'click', e => e.stopPropagation());
      this.listen(el, 'MDCIconToggle:change', e => {
        e.stopPropagation();
        const trg = e.currentTarget;
        const isOn = e.detail['isOn'];
        const hrefAt = isOn ? '__on' : '__off';
        const hrefTog = trg.getAttribute(`data-href${hrefAt}`);
        this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
          orgEvt: e,
          trigger: trg,
          href: trg.href || trg.getAttribute('data-href'),
          hrefTog: hrefTog,
          isOn: isOn
        }, getElDataMap(trg)));
      });
    });

    // Activate Menu items
    [...panel.querySelectorAll('.mdc-menu')].forEach(el => {
      this.listen(el, 'MDCMenu:selected', e => {
        e.stopPropagation();
        const trg = e.currentTarget;
        let v = e.detail['item'].getAttribute('data-zv');
        this.dispatchPanelEvent(v, Object.assign({
          orgEvt: e,
          trigger: e.detail['item'],
          href: trg.href || trg.getAttribute('data-href')
        }, getElDataMap(trg)));
      });
    });

    // Activate Tabs
    [...panel.querySelectorAll('.mdc-tab')].forEach(el => {
      this.listen(el, 'click', e => {
        e.stopPropagation();
        const trg = e.currentTarget;
        let v = trg.getAttribute('data-zv');
        this.dispatchPanelEvent(v, Object.assign({
          orgEvt: e,
          trigger: trg,
          href: trg.href || trg.getAttribute('data-href')
        }, getElDataMap(trg)));
      });
    });

    // Activate Lists
    const unActivateLi = e => enableClass(e, 'mdc-list-item--activated', false);
    const activateLi = e => enableClass(e, 'mdc-list-item--activated', true);
    [...panel.querySelectorAll('.mdc-list')].forEach(el => {
      this.listen(el, 'click', e => {
        [...el.querySelectorAll('li')].forEach(unActivateLi);
        const trg = e.path.find(e => toUpperCase(e.tagName) === 'LI');
        activateLi(trg);
        this.dispatchPanelEvent(trg.getAttribute('data-zv'), Object.assign({
          orgEvt: e,
          trigger: trg,
          href: trg.href || trg.getAttribute('data-href'),
        }, getElDataMap(trg)));
      });
    });

    // Hijack elements with a straight-up 'href' attribute.
    // Make them emit a 'href' event with the original
    // href or a href data attribute.
    [...panel.querySelectorAll('[href]')].forEach(el => {
      this.listen(el, 'click', e => {
        const trg = e.currentTarget;
        e.preventDefault();
        e.stopPropagation();
        let v = trg.getAttribute('data-zv') || 'href';
        this.dispatchPanelEvent(v, Object.assign({
          orgEvt: e,
          trigger: e.target,
          href: trg.href || trg.getAttribute('data-href')
        }, getElDataMap(trg)));
      });
    });

    //-----------------------------------------------------------[ Drag Drop ]--
    const dropEls = Array.from(panel.querySelectorAll('.folder_drop_zone'));
    const dragEls = Array.from(panel.querySelectorAll('[draggable]'));

    const activate = e => {
      e.preventDefault();
      e.target.classList.add('drag_over');
    };
    const onDragOver = e => {
      e.preventDefault();
    };
    const onDragLeave = e => {
      e.preventDefault();
      e.target.classList.remove('drag_over');
    };
    const onDragExit = e => {
      e.preventDefault();
      e.target.classList.remove('drag_over');
    };
    const deactivate = e => {
      e.preventDefault();
      e.target.classList.remove('drag_over');
    };
    const onDragStart = e => {
      e.dataTransfer.dropEffect = 'move';
      let o = getElDataMap(e.target);
      e.dataTransfer.setData('text/plain', JSON.stringify(o));
    };
    const justLog = e => {
      //    console.log(e)
    };
    const onDrop = e => {
      deactivate(e);
      e.stopPropagation();
      let data = JSON.parse(e.dataTransfer.getData('text/plain'));
      let o = getElDataMap(e.target);
      this.dispatchPanelEvent('drop_on', {custom: {'on': o, 'from': data}});
      return false;
    };

    dropEls.forEach(el => {
      el.addEventListener('dragover', onDragOver, false);
      el.addEventListener('dragenter', activate, false);
      el.addEventListener('dragexit', onDragExit, false);
      el.addEventListener('dragleave', onDragLeave, false);
      el.addEventListener('drop', onDrop, false);
    }, false);

    dragEls.forEach(el => {
      el.addEventListener('dragstart', onDragStart, false);
      el.addEventListener('dragend', justLog, false);
    }, false);


    //--------------------------------------------------------[ Async Populate ]--
    // Grab all elements with a 'zoo_async_json' class.
    // Call the given url, and then dispatch a panel event with the results.
    const async_json_els = panel.querySelectorAll('.zoo_async_json');
    Array.from(async_json_els).forEach(el => {
      let href = el.getAttribute('data-href');
      let event_value = el.getAttribute('data-zv');
      let onReply = this.onAsyncJsonReply.bind(this, event_value);
      this.user.fetchJson(href).then(onReply);
    });

    // Grab all elements with a 'zoo_async_html' class.
    // Call the given url, and then dispatch a panel event with the results.
    const async_html_els = panel.querySelectorAll('.zoo_async_html');
    Array.from(async_html_els).forEach(el => {
      let href = el.getAttribute('data-href');
      let event_value = el.getAttribute('data-zv');
      this.dispatchPanelEvent(event_value, {trigger: el, href: href});
    });

    // Calling this last makes sure that the final PANEL-READY event really is
    // dispatched right at the end of all of the enterDocument calls.
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

  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.PANEL} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Panel.panelEventCode(), e => {
   *      console.log('B got', Panel.panelEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchPanelEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.PANEL, dataObj);
    return this.dispatchEvent(event);
  };

}


export default Panel;