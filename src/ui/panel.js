import Component from './component.js';
import {identity, isDefAndNotNull, isNumber, toNumber, isUndefined} from 'badu';
import {
  evalModules,
  evalScripts,
  formToJSON,
  getElDataMap,
  splitScripts,
} from '../dom/utils.js';
import UserManager from '../user/usermanager.js';
import {UiEventType} from '../events/uieventtype.js';
import ZooyEventData from '../events/zooyeventdata.js';
import EVT from './evt.js';
import {
  renderButtons,
  renderCheckBoxes,
  renderChips,
  renderDataTables,
  renderFloatingActionButtons,
  renderFormFields,
  renderIconButtons,
  renderIconToggleButtons,
  renderLinearProgress,
  renderLists,
  renderMenus,
  renderMenuSurfaces,
  renderRadioButtons,
  renderRipples,
  renderSelectMenus,
  renderSliders,
  renderSwitches,
  renderTabBars,
  renderTextFieldIcons,
  renderTextFields,
} from './mdc/mdc.js';
import {getPath, objectToUrlParms, getQueryData, queryDataToMap} from "../uri/uri.js";

class Panel extends Component {

  static panelEventCode() {
    return UiEventType.PANEL;
  }

  static compReadyCode() {
    return UiEventType.READY;
  }


  constructor(uri) {
    super();

    this.qParamMap_ = new Map();
    this.uri_ = "";
    this.parseUri(uri);

    // Script are evaluated in the context of the panel.
    this.evalScripts = evalScripts(this);

    // Modules are just appended to the DOM and does not share scope with
    // the component. However, they are appended to this panel's DOM, and will
    // disappear when the panel is removed from the DOM.
    this.evalModules = evalModules(this);

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

    // Feature detect
    if ("AbortController" in window) {
      this.abortController = new AbortController();
    } else {
      this.abortController = {
        signal: void 0,
        abort: () => void 0
      }
    }

    this.listMap = new Map();

  };

  //---------------------------------------------------[ Getters and Setters ]--
  get uri() {
    const params = this.qParamMap_.size > 0
      ? "?" + objectToUrlParms(Object.fromEntries(this.qParamMap_))
      : "";
    return this.uri_ + params;
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

  parseUri(uri) {
    this.uri_ = getPath(uri);
    this.qParamMap_ = queryDataToMap(getQueryData(uri));
  }

  addToQParams(k, v) {
    this.qParamMap_.set(k, v);
  };

  removeFromQParams(k) {
    this.qParamMap_.delete(k);
  }

  clearQParams() {
    this.qParamMap_.clear();
  }


  //----------------------------------------------------[ Template Render ]-----
  /**
   * Temporarily render placeholder DOM
   * @param {Node!} placeholder
   */
  renderPlaceHolder(placeholder) {
    if (this.target) {
      this.placeholderDom_ = placeholder;
      this.target.insertBefore(this.placeholderDom_, null);
    }
  };


  /**
   * Expects HTML data from a call to the back.
   * @param {Function=} opt_callback An optional callback to call before
   * rendering the panel. This is useful for when you only want to attach the
   * new panel to the view right before you render it - meaning the existing
   * panel stays in place on the DOM for the duration of the fetch call.
   * @return {Promise} Returns a promise with this panel as value.
   */
  renderWithTemplate(opt_callback) {
    const usr = this.user;
    if (usr) {
      return usr.fetch(this.uri, this.abortController.signal).then(s => {
        this.assertCanRenderAsync();
        if (opt_callback) {
          opt_callback(this);
        }
        this.onRenderWithTemplateReply(s).catch(err => {
          if (err.message !== Component.compErrors().ALREADY_DISPOSED) {
            console.error('RenderWithTemplate Err:', err);
          }
        });
        return this;
      }).catch(identity);
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

  /**
   * Partially replace panel's content.
   * If an ID query selector (#something) is passed in, then that single node is replaced
   * in the panel DOM with the single node in the content DOM
   *
   * If a class query selector (.some_class) is passed in, all elements in the
   * panel's dom with that class is replaced with the matching
   * element ID in the content DOM matching the target DOMs element IDs
   *
   * NOTE: For the spot replacement to work, you need both the classname
   * and a unique element ID on the element you intend to replace.
   *
   * NOTE: Top level replacements will clobber child replacements.
   *
   * @param content
   * @param qs
   */
  onReplacePartialDom(content, qs) {

    const panelEl = this.getElement();
    if (isUndefined(panelEl)) { return; }
    const hyperText = content.html;

    if (qs.startsWith(".")) {
      [...panelEl.querySelectorAll(qs)]
        .filter(e => isDefAndNotNull(e.id))
        .map(e => [e, hyperText.querySelector(`#${e.id}`)])
        .filter(([target, replace]) => isDefAndNotNull(replace))
        .forEach(([target, replace]) => {
          target.parentNode.replaceChild(replace, target);
          this.parseContent(replace);
        })
    } else if (qs.startsWith("#")) {
      const replacementContent = hyperText.querySelector(qs);
      const target = panelEl.querySelector(qs);
      target.parentNode.replaceChild(replacementContent, target);
      this.parseContent(replacementContent);
    }

    this.evalScripts(content.scripts);
    this.evalModules(content.modules);
  }

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
      return this.user.fetchJson(this.uri_, this.abortController.signal)
        .then(json => {
          this.assertCanRenderAsync();
          if (opt_callback) {
            opt_callback(json, this);
          }
          this.onRenderWithJSON(json)
        }).catch(identity)
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
   * @param {Element} el
   * @param {Object} elDataMap
   * @param {Object} json
   */
  onAsyncJsonReply(el, elDataMap, json) {
    // Stub
  };


  onViewDataBroadcast(data) {
    // Stub
  };

  //--------------------------------------------------------[ JSON Render ]-----
  /**
   * @param {Element} panel
   */
  parseContent(panel) {
    // If we are in an environment where MDC is used.

    this.debugMe('Enable interactions. Panel:', panel);

    if (isDefAndNotNull(window.mdc) &&
      window.mdc.hasOwnProperty('autoInit')) {
      renderRipples.call(this, panel);
      renderButtons.call(this, panel);
      renderFloatingActionButtons.call(this, panel);
      renderIconButtons.call(this, panel);
      renderIconToggleButtons.call(this, panel);
      renderTabBars.call(this, panel);
      renderSwitches.call(this, panel);
      renderChips.call(this, panel);
      renderMenuSurfaces.call(this, panel);
      renderMenus.call(this, panel);
      renderLists.call(this, panel);
      renderSliders.call(this, panel);
      renderLinearProgress.call(this, panel);
      renderFormFields.call(this, panel);
      renderSelectMenus.call(this, panel, this);
      renderTextFieldIcons.call(this, panel);
      renderTextFields.call(this, panel);
      renderRadioButtons.call(this, panel);
      renderCheckBoxes.call(this, panel);
      renderDataTables.call(this, panel);
    }

    // If I am a modal cover (.tst__modal-base), and have the
    // .close_on_click class, then close myself on click.
    if (panel.classList.contains('tst__modal-base') &&
      panel.classList.contains('close_on_click')) {
      this.listen(panel, 'click', e => {
        if (e.target === panel) {
          this.dispatchPanelEvent('destroy_me');
        }
      })
    }

    [...panel.querySelectorAll(
      '.tst__button:not(.external):not(.mdc-data-table__row)')].forEach(
      el => {
        this.listen(el, 'click', e => {
          e.stopPropagation();
          const trg = e.currentTarget;
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href'],
          }, elDataMap));
        });
      });

    // Hijack elements with a straight-up 'href' attribute.
    // Make them emit a 'href' event with the original
    // href or a href data attribute.
    [...panel.querySelectorAll('[href]:not(.external)')].forEach(el => {
      this.listen(el, 'click', e => {
        const trg = e.currentTarget;
        e.preventDefault();
        e.stopPropagation();
        const elDataMap = getElDataMap(trg);
        let v = elDataMap['zv'] || 'href';
        this.dispatchPanelEvent(v, Object.assign({
          orgEvt: e,
          trigger: e.target,
          href: trg.href || elDataMap['href']
        }, elDataMap));
      });
    });

    // Hijack forms submit events for forms with a 'intercept_submit' class
    [...panel.querySelectorAll('form.intercept_submit')].forEach(el => {
      el.noValidate = true;
      this.listen(el, 'submit', e => {
        e.preventDefault();
        e.stopPropagation();
        const elDataMap = getElDataMap(el);
        const data = formToJSON(el.elements);
        this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
          orgEvt: e,
          trigger: e.target,
          formData: data,
          href: elDataMap['href']
        }, elDataMap));
      });

    });

    // Get all elements with class swapping functionality.
    [...panel.querySelectorAll('.tst__toggle_class_driver')].forEach(
      el => {
        const elDataMap = getElDataMap(el);
        const toggleTarget = elDataMap['toggle_class_target_id'];
        const toggleClass = elDataMap['toggle_class'];
        const targetEl = panel.querySelector(`#${toggleTarget}`)
        if (targetEl && toggleClass) {
          el.addEventListener('click', e => {
            e.stopPropagation();
            targetEl.classList.toggle(toggleClass);
          });
        }
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
      e.target.classList.add('drag_in_progress');
    };
    const onDragend = e => {
      e.target.classList.remove('drag_in_progress');
    };

    const onDrop = e => {
      deactivate(e);
      e.stopPropagation();
      let data = JSON.parse(e.dataTransfer.getData('text/plain'));
      let o = getElDataMap(e.target);
      this.dispatchPanelEvent('drop_on', {
        custom: {'on': o, 'from': data}
      });
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
      el.addEventListener('dragend', onDragend, false);
    }, false);


    //------------------------------------------------------[ Async Populate ]--
    // Grab all elements with a 'zoo_async_json' class.
    // Call the given url, and then dispatch a panel event with the results.
    [...panel.querySelectorAll('.zoo_async_json')].forEach(el => {
      const elDataMap = getElDataMap(el);
      const href = elDataMap['href'];
      const onReply = this.onAsyncJsonReply.bind(this, el, elDataMap);
      this.user.fetchJson(href, this.abortController.signal).then(onReply);

      const reusableJson = elDataMap['z_json_reusable'];
      if (reusableJson) {
        this.jsonCallFuncs = this.jsonCallFuncs || {};
        this.jsonCallFuncs[reusableJson] = () => {
          this.user.fetchJson(href, this.abortController.signal).then(onReply);
        }
      }

      const repeat = toNumber(elDataMap['z_interval']);
      if (isNumber(repeat)) {
        this.doOnBeat(() => {
          this.user.fetchJson(href, this.abortController.signal).then(onReply);
        }, repeat * 60 * 1000);
      }
    });

    // Grab all elements with a 'zoo_async_html' class.
    // Call the given url, and then populate the calling element with the
    // results. Parse the content and scripts in the context of this panel.
    [...panel.querySelectorAll('.zoo_async_html')].forEach(
      /**
       * @param {Element} el
       */
      el => {
        const elDataMap = getElDataMap(el);
        const href = elDataMap['href'];
        this.user.fetchAndSplit(href, this.abortController.signal)
          .then(data => {
            el.appendChild(data.html);
            this.parseContent(el);
            this.evalScripts(data.scripts);
            this.evalModules(data.modules);
          });
        const repeat = toNumber(elDataMap['z_interval']);
        if (isNumber(repeat)) {
          this.doOnBeat(() => {
            this.user.fetchAndSplit(href, this.abortController.signal)
              .then(data => {
                el.replaceChildren(data.html);
                this.parseContent(el);
                this.evalScripts(data.scripts);
                this.evalModules(data.modules);
              })
          }, repeat * 60 * 1000)
        }
      });
  };

  enterDocument() {
    const panel = this.getElement();
    this.parseContent(panel);
    this.evalScripts(this.responseObject.scripts);
    this.evalModules(this.responseObject.modules);

    // Calling this last makes sure that the final PANEL-READY event really is
    // dispatched right at the end of all the enterDocument calls.
    // However, note that the async populate is async, and my thus not be
    // completed by the time this fires.
    super.enterDocument();
  };

  exitDocument() {
    this.abortController.abort();
    super.exitDocument();
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
   * Dispatches a @code{UiEventType.PANEL} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * @example
   *    b.listen(a, Panel.panelEventCode(), e => {
   *      console.log('B got', Panel.panelEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object
   *  or if any of the handlers returns false this will also return false.
   */
  dispatchPanelEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.PANEL, dataObj);
    this.debugMe('PANEL EVENT FIRED. Value:', value, 'Opt DATA:', opt_data);
    return this.dispatchEvent(event);
  };

}


export default Panel;
