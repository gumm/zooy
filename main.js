//--------------------------------------------[ Standard component event data]--
class ZooyEventData {

  constructor(value, opt_data) {
    /**
     * @type {string|number}
     * @private
     */
    this.value_ = value;

    /**
     * @type {string|number|Object|Map|Set}
     * @private
     */
    this.data_ = opt_data || {};
  }

  getValue() {
    return this.value_;
  }

  getData() {
    return this.data_;
  }
}

// noinspection JSUnusedLocalSymbols

/**
 * @type {Map<string, boolean>}
 */
const boolMap = new Map()
    .set('true', true)
    .set('false', false);


//---------------------------------------------------------------[ Questions ]--
/**
 * @param {*} x
 * @return {string}
 */
const whatType = x => typeof x;

/**
 * @param {*} func
 * @return {function(): undefined}
 */
const maybeFunc = func => () => {
  if (whatType(func) === 'function') {
    return /** @type {!Function} */(func)()
  }
};


//--------------------------------------------------------------[ Assertions ]--
/**
 * @param {?} t
 * @returns {boolean}
 */
const isDef = t => t !== undefined;


/**
 * @param {*} t
 * @return {boolean}
 */
const isDefAndNotNull = t => t != null;


/**
 * @param {*} n
 * @return {boolean}
 */
const isString = n => whatType(n) === 'string';

/**
 * @param {*} n
 * @return {boolean}
 */
const isNumber = n => whatType(n) === 'number' &&
    !Number.isNaN(/** @type number */(n));


/**
 * @param {string} x
 * @return {number}
 */
const toNumber = x => +x;


//------------------------------------------------------------[ String Tools ]--
/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
const makeRandomString = () => {
  let x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
      Math.abs(Math.floor(Math.random() * x) ^ Date.now()).toString(36);
};

/**
 * Strip the leading char if it is the same as c
 * @param {string} c
 * @return {function(string): string}
 */
const stripLeadingChar = c => s => s.startsWith(c) ? s.slice(c.length) : s;

/**
 * Given a fallback value and an array, return a function that takes an
 * object or an array and returns the value at the path, or the fallback
 * value.
 * @param {*} f A fallback value
 * @param {Array<string|number>} arr
 * @returns {function((Object|Array)):(*)}
 */
const pathOr = (f, arr) => e => {
  const r = arr.reduce((p, c) => {
    try {
      return p[maybeNumber(c)];
    } catch (err) {
      return undefined
    }
  }, e);
  return r === undefined ? f : r;
};


/**
 * Returns a pseudo random string. Good for ids.
 * @param {?number=} opt_length An optional length for the string. Note this
 *    clearly reduces the randomness, and increases the chances of a collision.
 * @return {string}
 */
const randomId = opt_length => {
  const s = makeRandomString();
  return opt_length ? s.substr(0, opt_length) : s;
};

/**
 * Given a string, returns a number if you can. Else return what was given.
 * @param {*} s
 * @returns {number|*}
 */
const maybeNumber = s => {
  if (s === null) {
    return s;
  }
  if (whatType(s) === 'string' &&
      s.length > 1 &&
      s.startsWith('0') &&
      !s.startsWith('0.')) {
    return s;
  }
  const p = 1 * s;
  if (p > Number.MAX_SAFE_INTEGER) {
    return s
  }
  return Number.isNaN(p) ? s : p;
};

/*
EVENT LISTENER LEAK DETECTOR

var listenerCount = 0;
(function() {
    var ael = Node.prototype.addEventListener;
    Node.prototype.addEventListener = function() {
         listenerCount++;
         ael.apply(this, arguments);
    }
    var rel = Node.prototype.removeEventListener;
    Node.prototype.removeEventListener = function() {
         listenerCount--;
         rel.apply(this, arguments);
    }
})();

 */

class EVT extends EventTarget {

  //----------------------------------------------------------------[ Static ]--
  static makeEvent(event, data)  {
    return new CustomEvent(event, {detail: data});
  };

  constructor() {
    super();

    /**
     * A map of listener targets to a object of event: functions
     * When adding a listener, immediately also create the un-listen functions
     * and store those in a object keyed with the event.
     * Store these objects against the target in a map
     * @type {Map<!EventTarget, !Object<string, !Function>>}
     * @private
     */
    this.listeningTo_ = new Map();

    /**
     * A set of components that are currently listening to this component
     * @type {!Set<!EventTarget>}
     * @private
     */
    this.isObservedBy_ = new Set();


    /**
     * A set of interval timers as defined by setInterval.
     * Use this to store the timers created particular to this component.
     * On destruction, these timers will be cleared.
     * @type {Set<any>}
     * @private
     */
    this.activeIntervals_ = new Set();

    /**
     * True if this is disposed.
     * @type {boolean}
     * @private
     */
    this.disposed_ = false;

    /**
     * Set this to true to get some debug in the console.
     * @type {boolean}
     * @private
     */
    this.debugMode_ = false;
  };


  set debugMode(bool) {
    if ((typeof bool) !== 'boolean') {
      throw ('This must be a boolean')
    }
    this.debugMode_ = bool;
  }

  get debugMode() {
    return this.debugMode_;
  }

  get disposed() {
    return this.disposed_;
  }

  debugMe(...s) {
    if (this.debugMode) {
      console.log.apply(null, [this.constructor.name, 'DEBUG:', ...s]);
    }
  }


  //-----------------------------------------------[ Listeners and Listening ]--
  /**
   * @param {!EventTarget|!EVT} comp
   */
  isListenedToBy(comp) {
    this.isObservedBy_.add(comp);
  }

  /**
   * WARNING! DO not use options={passive: true} here. It disallows us to
   * use preventDefault when we intercept the form, and that leads to a
   * general inability to POST forms.
   *
   * @param {!EventTarget|!EVT|!Node} target
   * @param {string} event
   * @param {!Function} action
   * @param {boolean|!Object} options
   */
  listen(target, event, action, options=false) {
    target.addEventListener(event, action, options);
    const currVal = this.listeningTo_.get(target) || {};
    currVal[event] = () => target.removeEventListener(event, action, options);
    this.listeningTo_.set(target, currVal);

    if (isDef(target.isListenedToBy)) {
      target.isListenedToBy(this);
    }
  };

  /**
   * Remove self from all components tt are listening to me.
   */
  stopBeingListenedTo() {
    for (const observer of this.isObservedBy_) {
      observer.stopListeningTo(this);
      this.isObservedBy_.delete(observer);
    }
  }

  /**
   * Stop listening to all events on target.
   * @param {!EventTarget|!EVT|!Node|undefined} target
   * @param {string=} opt_event
   */
  stopListeningTo(target, opt_event) {
    if (!target) { return }
    if (this.listeningTo_.has(target)) {

      if (isDef(target.isObservedBy_)) {
        target.isObservedBy_.delete(this);
      }

      if (isDef(opt_event)) {
        Object
            .entries(this.listeningTo_.get(target))
            .forEach(([key, value]) => {
              if (key === opt_event) {
                /** @type {!Function} */(value)();
              }
            });
        if (!Object.keys(this.listeningTo_.get(target)).length) {
          this.listeningTo_.delete(target);
        }
      } else {
        Object.values(this.listeningTo_.get(target)).forEach(e => e());
        this.listeningTo_.delete(target);
      }

    }
  }

  /**
   * Removes all the event listeners that is managed by this
   * component.
   */
  removeAllListener() {
    for (const target of this.listeningTo_.keys()) {
      this.stopListeningTo(target);
    }
  }


  clearAllIntervals() {
    for (const interval of this.activeIntervals_) {
      clearInterval(interval);
      this.activeIntervals_.delete(interval);
    }
  }

  doOnBeat(f, interval) {
    const clearInt = setInterval(f, interval);
    this.activeIntervals_.add(clearInt);
  }


  /**
   * Disposes of the component.  Calls `exitDocument`, which is expected to
   * remove event handlers and clean up the component.  Propagates the call to
   * the component's children, if any. Removes the component's DOM from the
   * document unless it was decorated.
   * @protected
   */
  disposeInternal() {
    this.stopBeingListenedTo();
    this.removeAllListener();
    this.clearAllIntervals();
    this.disposed_ = true;
  };

  dispose() {
    this.disposeInternal();
  }

}

/**
 * @fileoverview Panel Event Types.
 *
 */

/**
 * Constants for panel event.
 * @enum {string}
 */
// noinspection JSUnusedGlobalSymbols
const UiEventType = {
  /**
   * Dispatched after the content from the template is in the DOM
   * and the in-line scripts from the AJAX call has been eval'd.
   */
  COMP: randomId(),
  COMP_DRAG_START: randomId(),
  COMP_DRAG_MOVE: randomId(),
  COMP_DRAG_END: randomId(),
  PANEL: randomId(),
  VIEW: randomId(),
  SPLIT: randomId(),
  READY: randomId(),
  PANEL_MINIMIZE: randomId(),
  FORM_SUBMIT_SUCCESS: randomId(),
};

var EN_US = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
function en_US (diff, idx) {
    if (idx === 0)
        return ['just now', 'right now'];
    var unit = EN_US[Math.floor(idx / 2)];
    if (diff > 1)
        unit += 's';
    return [diff + " " + unit + " ago", "in " + diff + " " + unit];
}

var ZH_CN = ['秒', '分钟', '小时', '天', '周', '个月', '年'];
function zh_CN (diff, idx) {
    if (idx === 0)
        return ['刚刚', '片刻后'];
    var unit = ZH_CN[~~(idx / 2)];
    return [diff + " " + unit + "\u524D", diff + " " + unit + "\u540E"];
}

/**
 * Created by hustcc on 18/5/20.
 * Contract: i@hust.cc
 */
/**
 * All supported locales
 */
var Locales = {};
/**
 * register a locale
 * @param locale
 * @param func
 */
var register = function (locale, func) {
    Locales[locale] = func;
};
/**
 * get a locale, default is en_US
 * @param locale
 * @returns {*}
 */
var getLocale = function (locale) {
    return Locales[locale] || Locales['en_US'];
};

/**
 * Created by hustcc on 18/5/20.
 * Contract: i@hust.cc
 */
var SEC_ARRAY = [
    60,
    60,
    24,
    7,
    365 / 7 / 12,
    12,
];
/**
 * format Date / string / timestamp to timestamp
 * @param input
 * @returns {*}
 */
function toDate(input) {
    if (input instanceof Date)
        return input;
    // @ts-ignore
    if (!isNaN(input) || /^\d+$/.test(input))
        return new Date(parseInt(input));
    input = (input || '')
        // @ts-ignore
        .trim()
        .replace(/\.\d+/, '') // remove milliseconds
        .replace(/-/, '/')
        .replace(/-/, '/')
        .replace(/(\d)T(\d)/, '$1 $2')
        .replace(/Z/, ' UTC') // 2017-2-5T3:57:52Z -> 2017-2-5 3:57:52UTC
        .replace(/([+-]\d\d):?(\d\d)/, ' $1$2'); // -04:00 -> -0400
    return new Date(input);
}
/**
 * format the diff second to *** time ago, with setting locale
 * @param diff
 * @param localeFunc
 * @returns
 */
function formatDiff(diff, localeFunc) {
    /**
     * if locale is not exist, use defaultLocale.
     * if defaultLocale is not exist, use build-in `en`.
     * be sure of no error when locale is not exist.
     *
     * If `time in`, then 1
     * If `time ago`, then 0
     */
    var agoIn = diff < 0 ? 1 : 0;
    /**
     * Get absolute value of number (|diff| is non-negative) value of x
     * |diff| = diff if diff is positive
     * |diff| = -diff if diff is negative
     * |0| = 0
     */
    diff = Math.abs(diff);
    /**
     * Time in seconds
     */
    var totalSec = diff;
    /**
     * Unit of time
     */
    var idx = 0;
    for (; diff >= SEC_ARRAY[idx] && idx < SEC_ARRAY.length; idx++) {
        diff /= SEC_ARRAY[idx];
    }
    /**
     * Math.floor() is alternative of ~~
     *
     * The differences and bugs:
     * Math.floor(3.7) -> 4 but ~~3.7 -> 3
     * Math.floor(1559125440000.6) -> 1559125440000 but ~~1559125440000.6 -> 52311552
     *
     * More information about the performance of algebraic:
     * https://www.youtube.com/watch?v=65-RbBwZQdU
     */
    diff = Math.floor(diff);
    idx *= 2;
    if (diff > (idx === 0 ? 9 : 1))
        idx += 1;
    return localeFunc(diff, idx, totalSec)[agoIn].replace('%s', diff.toString());
}
/**
 * calculate the diff second between date to be formatted an now date.
 * @param date
 * @param relativeDate
 * @returns {number}
 */
function diffSec(date, relativeDate) {
    var relDate = relativeDate ? toDate(relativeDate) : new Date();
    return (+relDate - +toDate(date)) / 1000;
}

/**
 * format a TDate into string
 * @param date
 * @param locale
 * @param opts
 */
var format = function (date, locale, opts) {
    // diff seconds
    var sec = diffSec(date, opts && opts.relativeDate);
    // format it with locale
    return formatDiff(sec, getLocale(locale));
};

/**
 * Created by hustcc on 18/5/20.
 * Contract: i@hust.cc
 */
register('en_US', en_US);
register('zh_CN', zh_CN);

/**
 * Gets the current value of a checkable input element.
 * @param {Element} el The element.
 * @return {?string} The value of the form element (or null).
 * @private
 */
const getInputChecked_ = function(el) {
  return el.checked ? /** @type {?} */ (el).value : null;
};

/**
 * Gets the current value of a select-one element.
 * @param {Element} el The element.
 * @return {?string} The value of the form element (or null).
 * @private
 */
const getSelectSingle_ = function(el) {
  const selectedIndex = /** @type {!HTMLSelectElement} */ (el).selectedIndex;
  return selectedIndex >= 0 ?
      /** @type {!HTMLSelectElement} */ (el).options[selectedIndex].value :
      null;
};

/**
 * Gets the current value of a select-multiple element.
 * @param {Element} el The element.
 * @return {Array<string>?} The value of the form element (or null).
 * @private
 */
const getSelectMultiple_ = function(el) {
  const values = [];
  for (let option, i = 0;
       option = /** @type {!HTMLSelectElement} */ (el).options[i]; i++) {
    if (option.selected) {
      values.push(option.value);
    }
  }
  return values.length ? values : null;
};

/**
 * Gets the current value of any element with a type.
 * @param {Element} el The element.
 * @return {string|Array<string>|null} The current value of the element
 *     (or null).
 */
const getValue = function(el) {
  // Elements with a type may need more specialized logic.
  const type = /** @type {!HTMLInputElement} */ (el).type;
  switch (isString(type) && type.toLowerCase()) {
    case 'checkbox':
    case 'radio':
      return getInputChecked_(el);
    case 'select-one':
      return getSelectSingle_(el);
    case 'select-multiple':
      return getSelectMultiple_(el);
    default:
      // Not every element with a value has a type (e.g. meter and progress).
      return el.value != null ? el.value : null;
  }
};


/**
 * Converts a set of form elements to a object with form names, as keys,
 * and form values as values.
 * Use like this:
 *    const data = formToJSON(formElement.elements);
 * @param elements
 * @returns {*|(function(*, *): *)}
 */
const formToJSON = elements => [...elements].reduce((data, element) => {
  data[element.name] = element.value;
  return data;
}, {});


/**
 * Replaces a node in the DOM tree. Will do nothing if `oldNode` has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
const replaceNode = (newNode, oldNode) => {
  const parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
};


/**
 * Removes a node from its parent.
 * @param {!Node|undefined} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
const removeNode = node => {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};

/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
const insertSiblingAfter = (newNode, refNode) => {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};

/**
 * @param {!Node} node
 * @return {boolean}
 */
const isInPage = node => {
  return (node === document.body) ? false : document.body.contains(node);
};

/**
 * @param {!HTMLElement} el
 * @return {!Array<number>}
 */
const getPos = el => {
  return [el.offsetLeft, el.offsetTop];
};


/**
 * Make a random RGBA colour string.
 * The alpha channel is 0.5 by default but can be passed in.
 * Useful for debugging.
 * @param {number=} opt_a
 * @return {string}
 */
const randomColour = opt_a => {
  return [1, 2, 3].map(() => Math.floor(Math.random() * 256) + 1)
      .reduce((p, c) => `${p}${c},`, 'rgba(') + `${opt_a ? opt_a : 0.5}`;
};


const totalWidth = el => {
  const s = window.getComputedStyle(el);
  const width = el.offsetWidth;
  const margin = parseFloat(s.marginLeft) + parseFloat(s.marginRight);
  const padding = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
  const border = parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
  return width + margin - padding + border
};

const totalHeight = el => {
  const s = window.getComputedStyle(el);
  const height = el.offsetHeight;
  const margin = parseFloat(s.marginTop) + parseFloat(s.marginBottom);
  const padding = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
  const border = parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth);
  return height + margin - padding + border
};


/**
 * Evaluates each of the scripts in the ajaxScriptsStrings_ map in turn.
 * The scripts are evaluated in the scope of this component. For these
 * scripts, "this" is the evaluating component object.
 * @param {!Component} comp
 * @return {function(?NodeList)}
 */
const evalScripts = comp => arr => {
  arr && Array.from(arr).forEach(s => {
    (function() {
      eval(s.text);
    }).bind(comp)();
  });
};


/**
 * Module scripts can not be evaluated with a given scope. The only way we can
 * get them to do their thing is to append them as DOM nodes and let the
 * browser take things from there. To them, the global "this" is undefined, and
 * the component object is not easily reachable. They are append as children of
 * the root component element as supplied by component.getElement().
 * @param comp
 * @returns {Function}
 */
const evalModules = comp => arr => {
  arr && Array.from(arr).forEach(e => {
    (function() {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = e.textContent;
      const el = comp.getElement();

      // Convoluted way to access to this component in the script
      // If the original script tag contained a date-set declaration named
      // "zv_comp_access", then we park component access inside the component
      // root element under the key: zvComponent, and add a class to that
      // element so a querySelector(`${zv_comp_access}`) will find the
      // correct element from where we can then get to the panel.
      const zvPanelAccess = getElDataMap(e)['zv_comp_access'];
      if (zvPanelAccess) {
        el.zvComponent = comp;
        el.classList.add(zvPanelAccess);
      }
      el.appendChild(script);
    }).bind(comp)();
  });
};


/**
 * This makes a distinction between normal script tags and module scripts.
 * Normal scripts are evaluated in the scope of the component where the DOM
 * arrived. The script is never added to the DOM, but rather evaluated on
 * the fly. For these scripts "this" is the component object.
 *
 * Module scripts can not be evaluated with a given scope. The only way we can
 * get them to do their thing is to append them as DOM nodes and let the
 * browser take things from there. To them, the global "this" is undefined, and
 * the component object is not easily reachable. They are append as children of
 * the root component element as supplied by component.getElement().
 * @param {string} data
 * @returns {{
 *    html: Element,
 *    scripts: (NodeListOf<HTMLElementTagNameMap> | NodeListOf<Element>),
 *    modules: (NodeListOf<HTMLElementTagNameMap> | NodeListOf<Element>)
 *      }}
 */
const splitScripts = data => {
  const DF = new DOMParser().parseFromString(data, 'text/html');
  const df = /** @type {Document} */ (DF);
  return {
    html: df.body.firstElementChild,
    scripts: df.querySelectorAll('script:not([type="module"])'),
    modules: df.querySelectorAll('script[type="module"]')
  };
};


/**
 * @param {string} t
 */
const handleTemplateProm = t => Promise.resolve(splitScripts(t));


const enableClass = (e, className, bool) => {
  bool ? e.classList.add(className) : e.classList.remove(className);
};


/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.  This method may throw a DOM
 * exception if the class name is empty or invalid.
 * @param {Element} element DOM node to toggle class on.
 * @param {string} className Class to toggle.
 * @return {boolean} True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
const toggleClass = (element, className) => {
  const add = !Array.from(element.classList).includes(className);
  enableClass(element, className, add);
  return add;
};


const getElDataMap = el => Object.assign({}, el.dataset || {});


const dtFormatter = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};

const dFormatter = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const dtf = new Intl.DateTimeFormat(
    "en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

const dateToZooyStdTimeString = d => {
  // [ { type: 'month', value: 'Aug' },
  //   { type: 'literal', value: ' ' },
  //   { type: 'day', value: '05' },
  //   { type: 'literal', value: ', ' },
  //   { type: 'year', value: '2020' },
  //   { type: 'literal', value: ', ' },
  //   { type: 'hour', value: '15' },
  //   { type: 'literal', value: ':' },
  //   { type: 'minute', value: '16' },
  //   { type: 'literal', value: ':' },
  //   { type: 'second', value: '17' } ]
  const [
    {value: mo}, ,
    {value: da}, ,
    {value: ye}, ,
    {value: hr}, ,
    {value: mn}, ,
    {value: sc}, ,
  ] = dtf.formatToParts(d);
  return `${da} ${mo} ${ye}, ${hr}:${mn}:${sc}`;
};

const mapDataToEls = (rootEl, json) => {
  // console.log('mapDataToEls', rootEl, json);

  if (!json) {
    return;
  }

  [...rootEl.querySelectorAll('[data-zdd]')].forEach(el => {
    const dataMap = getElDataMap(el);
    const lldRef = dataMap['zdd'];
    const parseAs = dataMap['zdd_parse_as'];
    let units = dataMap['zdd_units'] || '';
    let v = pathOr(undefined, lldRef.split('.'))(json);

    if (isDefAndNotNull(v)) {
      if (parseAs) {
        switch (parseAs) {
          case 'obfuscated':
            /**
             * @param {string} s
             * @return {function(number): boolean}
             */
            const tst = s => i => i < s.length - 4;
            const t = tst(v);
            const ob = s => s.split('').map((c, i) => t(i) ? '*' : c).join('');
            v = ob(v);
            break;
          case 'frac_100':
            v = Math.round((v * 100) * 100) / 100;
            break;
          case 'date_and_time':
            v = new Date(v).toLocaleString(undefined, dtFormatter);
            break;
          case 'date':
            v = new Date(v).toLocaleString(undefined, dFormatter);
            break;
          case 'moment_ago':
            let ts = v;
            if (isNumber(ts) && ts < 946684800000) {
              ts = ts * 1000;
            }
            const d = new Date(ts);

            const ago = format(d);
            const time = dateToZooyStdTimeString(d);

            v = `${ago} (${time})`;
            break;
          case 'linear-progress':
            const max = toNumber(dataMap.zpmax);
            const prog = el.linProg;
            if (max && prog) {
              prog.progress = v / max;
              v = undefined;
            }
            break;
            // Do nothing;
        }
      }
    }

    if (v) {
      el.innerHTML = v + units;
    }
  });
};

var domUtils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  getValue: getValue,
  formToJSON: formToJSON,
  replaceNode: replaceNode,
  removeNode: removeNode,
  insertSiblingAfter: insertSiblingAfter,
  isInPage: isInPage,
  getPos: getPos,
  randomColour: randomColour,
  totalWidth: totalWidth,
  totalHeight: totalHeight,
  evalScripts: evalScripts,
  evalModules: evalModules,
  splitScripts: splitScripts,
  handleTemplateProm: handleTemplateProm,
  enableClass: enableClass,
  toggleClass: toggleClass,
  getElDataMap: getElDataMap,
  mapDataToEls: mapDataToEls
});

/**
 * Errors thrown by the component.
 * @enum {string}
 */
const ComponentError = {
  /**
   * Error when a method is not supported.
   */
  NOT_SUPPORTED: 'Method not supported',

  /**
   * Error when the given element can not be decorated.
   */
  DECORATE_INVALID: 'Invalid element to decorate',

  /**
   * Error when the component is already rendered and another render attempt is
   * made.
   */
  ALREADY_RENDERED: 'Component already rendered',

  /**
   * Error when an already disposed component is attempted to be rendered.
   */
  ALREADY_DISPOSED: 'Component already disposed',

  /**
   * Error when an attempt is made to set the parent of a component in a way
   * that would result in an inconsistent object graph.
   */
  PARENT_UNABLE_TO_BE_SET: 'Unable to set parent component',

  /**
   * Error when an attempt is made to add a child component at an out-of-bounds
   * index.  We don't support sparse child arrays.
   */
  CHILD_INDEX_OUT_OF_BOUNDS: 'Child component index out of bounds',

  /**
   * Error when an attempt is made to remove a child component from a component
   * other than its parent.
   */
  NOT_OUR_CHILD: 'Child is not in parent component',

  /**
   * Error when an operation requiring DOM interaction is made when the
   * component is not in the document
   */
  NOT_IN_DOCUMENT: 'Operation not supported while component is not in document',

  /**
   * Error when an invalid component state is encountered.
   */
  STATE_INVALID: 'Invalid component state'
};


class Component extends EVT {

  //----------------------------------------------------------------[ Static ]--
  static compEventCode() {
    return UiEventType.COMP;
  }

  static compReadyCode() {
    return UiEventType.READY;
  }

  static compErrors() {
    return ComponentError
  }

  constructor() {
    super();

    /**
     * A function that returns a newly minted element.
     * @return {!HTMLElement|!Element|!DocumentFragment}
     * @private
     */
    this.makeDomFunc_ = () =>
        /** @type {!HTMLElement} */(document.createElement('div'));


    /**
     * Whether the component is in the document.
     * @private {boolean}
     */
    this.inDocument_ = false;

    /**
     * The DOM element for the component.
     * @private {!Node|undefined}
     */
    this.element_ =  void 0;

    /**
     * Arbitrary data object associated with the component.  Such as meta-data.
     * @private {*}
     */
    this.model_ = void 0;

    /**
     * A DOM element where this component will be rendered to.
     * This does not need to be an element in this component's parent DOM.
     * @private {Element|undefined}
     */
    this.target_ = void 0;

    /**
     * Parent component to which events will be propagated.  This property is
     * strictly private and must not be accessed directly outside of this class!
     * @private {Component|undefined}
     */
    this.parent_ = void 0;

    /**
     * A map of child components.  Lazily initialized on first use.  Must be
     * kept in sync with `childIndex_`.  This property is strictly private and
     * must not be accessed directly outside of this class!
     * @private {Map<string, Component>?}
     */
    this.children_ = new Map();

    /**
     * A function guaranteed to be called before the component ready
     * event is fired.
     * @type {!Function}
     * @private
     */
    this.beforeReadyFunc_ = () => void 0;

  };

  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * @param {Element|undefined} e
   */
  set target(e) {
    this.target_ = e;
  }

  /**
   * Sets the model associated with the UI component.
   * @param {*} m
   */
  set model(m) {
    this.model_ = m;
  }

  /**
   * Returns the model associated with the UI component.
   * @return {*}
   */
  get model() {
    return this.model_
  }


  /**
   * @param {boolean} bool
   */
  set isInDocument(bool) {
    this.inDocument_ = bool;
  }

  /**
   * @return {boolean}
   */
  get isInDocument() {
    return this.inDocument_;
  }

  /**
   * A function that makes a DOM element.
   * @param {!function():(!HTMLElement|!Element|!DocumentFragment)} func
   */
  set domFunc(func) {
    this.makeDomFunc_ = func;
  }

  /**
   * @param {!Function} func A callback guaranteed to fire after the panels is
   * ready, and in the document, but before the
   * {@code UiEventType.READY} event is fired.
   */
  set readyFunc(func) {
    this.beforeReadyFunc_ = func;
  }


  //--------------------------------------------------------[ DOM Management ]--
  setElementInternal_(frag) {
    this.element_ = frag;
  }

  /**
   * Gets the component's element.
   * @return {!Node|undefined} The element
   *    for the component.
   */
  getElement() {
    return this.element_;
  };

  /**
   * Creates the initial DOM representation for the component.  The default
   * implementation is to set this.element_ = div.
   */
  createDom() {
    this.element_ = this.makeDomFunc_();
  };


  /**
   * Renders the component.  If a parent element is supplied, the component's
   * element will be appended to it.  If there is no optional parent element and
   * the element doesn't have a parentNode then it will be appended to the
   * document body.
   *
   * If this component has a parent component, and the parent component is
   * not in the document already, then this will not call `enterDocument`
   * on this component.
   *
   * Throws an Error if the component is already rendered.
   *
   * @param {Element=} opt_parentElement Optional parent element to render the
   *    component into.
   */
  render(opt_parentElement) {
    this.render_(opt_parentElement);
  };


  /**
   * Renders the component.  If a parent element is supplied, the component's
   * element will be appended to it.  If there is no optional parent element and
   * the element doesn't have a parentNode then it will be appended to the
   * document body.
   *
   * If this component has a parent component, and the parent component is
   * not in the document already, then this will not call `enterDocument`
   * on this component.
   *
   * Throws an Error if the component is already rendered.
   *
   * @param {Element=} opt_target Optional parent element to render the
   *    component into.
   * @private
   */
  render_(opt_target) {
    if (this.disposed) {
      throw new Error(ComponentError.ALREADY_DISPOSED);
    }

    if (this.isInDocument) {
      throw new Error(ComponentError.ALREADY_RENDERED);
    }

    if (!this.element_) {
      this.createDom();
    }
    const rootEl = /** @type {!Node} */(this.element_);

    if (opt_target) {
      this.target_ = opt_target;
    }

    if (this.target_) {
      if (!isInPage(rootEl)) {
        this.target_.insertBefore(rootEl, null);
      }
    } else {
      if (!isInPage(/** @type {!Node} */(rootEl))) {
        document.body.appendChild(rootEl);
      }
    }

    // If this component has a parent component that isn't in the document yet,
    // we don't call enterDocument() here.  Instead, when the parent component
    // enters the document, the enterDocument() call will propagate to its
    // children, including this one.  If the component doesn't have a parent
    // or if the parent is already in the document, we call enterDocument().
    if (!this.parent_ || this.parent_.isInDocument) {
      this.enterDocument();
    }
  };


  //------------------------------------------------------------[ Life-cycle ]--
  executeBeforeReady() {
    this.beforeReadyFunc_();
  }

  /**
   * Called when the component's element is known to be in the document. Anything
   * using document.getElementById etc. should be done at this stage.
   *
   * If the component contains child components, this call is propagated to its
   * children.
   */
  enterDocument() {

    // First check if I am disposed. If so, dont enter the document.
    // This may happen on slow networks where the user clicks multiple times
    // and multiple queries are in flight...
    if (this.disposed) {
      removeNode(this.getElement());
    } else {

      this.isInDocument = true;

      // Propagate enterDocument to child components that have a DOM, if any.
      // If a child was decorated before entering the document (permitted when
      // goog.ui.Component.ALLOW_DETACHED_DECORATION is true), its enterDocument
      // will be called here.
      [...this.children_.values()].forEach(child => {
        if (!child.isInDocument && child.getElement()) {
          child.enterDocument();
        }
      });

      this.executeBeforeReady();
      this.dispatchCompEvent(UiEventType.READY);
    }

  };

  /**
   * Called by dispose to clean up the elements and listeners created by a
   * component, or by a parent component/application who has removed the
   * component from the document but wants to reuse it later.
   *
   * If the component contains child components, this call is propagated to its
   * children.
   *
   * It should be possible for the component to be rendered again once this
   * method has been called.
   */
  exitDocument() {
    // Propagate exitDocument to child components that have been rendered, if any.

    [...this.children_.values()].forEach(child => {
      if (child.isInDocument) {
        child.exitDocument();
      }
    });

    this.stopBeingListenedTo();
    this.removeAllListener();
    this.isInDocument = false;
    removeNode(this.getElement());
  };


  /**
   * Disposes of the component.  Calls `exitDocument`, which is expected to
   * remove event handlers and clean up the component.  Propagates the call to
   * the component's children, if any. Removes the component's DOM from the
   * document unless it was decorated.
   * @protected
   */
  disposeInternal() {

    if (this.isInDocument) {
      this.exitDocument();
    }

    // Disposes of the component's children, if any.
    if (this.children_) {
      [...this.children_.values()].forEach(child => child.disposeInternal());
    }

    // Detach the component's element from the DOM, unless it was decorated.
    if (this.element_) {
      removeNode(this.element_);
    }

    this.children_ = null;
    this.element_ = void 0;
    this.model_ = null;
    this.parent_ = null;

    super.disposeInternal();
  };

  dispose() {
    if (this.abortController) {
      this.abortController.abort();
    }
    const me = this.getElement();
    if (me) {
      const els = this.getElement().querySelectorAll("[data-mdc-auto-init]");
      [...els].forEach(e => {
        try {
          e[e.getAttribute('data-mdc-auto-init')].destroy();
        } catch (e) {
          // do nothing...
        }

      });
    }
    super.dispose();
  }


  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.COMP} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Component.compEventCode(), e => {
   *      console.log('B got', Component.compEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchCompEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.COMP, dataObj);
    return this.dispatchEvent(event);
  };

}

// noinspection SpellCheckingInspection
/**
 * @enum {string}
 */
const EV = {
  // Mouse events
  CLICK: 'click',
  RIGHTCLICK: 'rightclick',
  DBLCLICK: 'dblclick',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',
  MOUSEENTER: 'mouseenter',
  MOUSELEAVE: 'mouseleave',

  // Touch events
  // Note that other touch events exist, but we should follow the W3C list here.
  // http://www.w3.org/TR/touch-events/#list-of-touchevent-types
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  TOUCHCANCEL: 'touchcancel',

  // Transitions
  TRANSITIONEND: 'transitionend',
};

/**
 * @type {Array<string>}
 */
const touchEvents = [EV.TOUCHMOVE, EV.TOUCHSTART, EV.TOUCHEND];

/**
 * @param {Event} ev
 * @return {boolean}
 */
const isTouchEvent = ev => touchEvents.includes(ev.type);

/**
 * Given a touch event, just add the clientX and clientY values where
 * they are on mouse event.
 * @param {MouseEvent|TouchEvent} ev
 * @return {Event}
 */
const normalizeEvent = ev => {
  if (isTouchEvent(ev)) {
    ev.clientX = ev.targetTouches[0].clientX;
    ev.clientY = ev.targetTouches[0].clientY;
  }
  return ev;
};

/**
 * @param {Function} onStart
 * @param {Function} onMove
 * @param {Function} onEnd
 * @param {string} degreesOfFreedom
 * @return {function(!Event)}
 */
const dragStartListener = (onStart, onMove, onEnd, degreesOfFreedom) =>
    event => {
      event.preventDefault();
      const ev = normalizeEvent(event);
      const target = /** @type {!HTMLElement} */ (ev.currentTarget);
      const [left, top] = getPos(target);
      const xOrg = ev.clientX - left;
      const yOrg = ev.clientY - top;

      const startEmit = onStart(left, top, xOrg, yOrg, target);
      const endEmit = onEnd(left, top, xOrg, yOrg, target);
      const moveEmit = onMove(left, top, xOrg, yOrg, target);

      // Drag move.
      let dragFunc = freeMoveListener(moveEmit, target, xOrg, yOrg);
      if (degreesOfFreedom === 'x') {
        dragFunc = xMoveOnlyListener(moveEmit, target, xOrg);
      } else if (degreesOfFreedom === 'y') {
        dragFunc = yMoveOnlyListener(moveEmit, target, xOrg, yOrg);
      }

      const cancelFunc = e => {
        document.removeEventListener(EV.MOUSEMOVE, dragFunc, true);
        document.removeEventListener(EV.TOUCHMOVE, dragFunc, true);
        document.removeEventListener(EV.MOUSEUP, cancelFunc, true);
        document.removeEventListener(EV.TOUCHEND, cancelFunc, true);
        endEmit(e);
      };

      document.addEventListener(EV.MOUSEUP, cancelFunc, true);
      document.addEventListener(EV.TOUCHEND, cancelFunc, true);
      document.addEventListener(EV.MOUSEMOVE, dragFunc, true);
      document.addEventListener(EV.TOUCHMOVE, dragFunc, true);
      startEmit(event);

      return cancelFunc;
    };


/**
 * @param {!Function} emit
 * @param {!HTMLElement} target
 * @param {number} xOrg
 * @param {number} yOrg
 * @return {!Function}
 */
const freeMoveListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.left = `${ev.clientX - xOrg}px`;
  target.style.top = `${ev.clientY - yOrg}px`;
  emit(ev);
};

const xMoveOnlyListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.left = `${ev.clientX - xOrg}px`;
  emit(ev);
};

const yMoveOnlyListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.top = `${ev.clientY - yOrg}px`;
  emit(ev);
};

//--------------------------------------------------------[ Event Emitters ]--
const makeEmitter = (comp, evType) => (left, top, xOrg, yOrg, target) => ev => {
  comp.dispatchCompEvent(evType, {
    component: comp,
    browserEvent: ev,
    left: left,
    top: top,
    clientX: ev.clientX,
    clientY: ev.clientY,
    xOrg: xOrg,
    yOrg: yOrg,
    deltaX: ev.clientX - xOrg - left,
    deltaY: ev.clientY - yOrg - top,
    target: target
  });
};


class Dragger extends Component {

  /**
   * @param {string} freedom Restrict the directions in which the
   * dragger can be moved.
   */
  constructor(freedom = 'xy') {
    super();

    /**
     * @type {string}
     * @private
     */
    this.degreesOfFreedom_ = ['x', 'y', 'xy'].includes(freedom)
        ? freedom
        : 'xy';

    /**
     * @type {!Node|undefined}
     * @private
     */
    this.dragHandle_ = void 0;

    /**
     * Track state. A dragger can either be locked (not draggable) or
     * unlocked (draggable).
     * Once unlocked, calling unlock again will not add more listeners.
     * The default state is locked, but the moment the component renders,
     * it becomes unlocked - by default;
     * @type {boolean}
     * @private
     */
    this.isLocked_ = true;


    this.cancelDrag_ = e => null;

  };

  cancelDrag(event) {
    this.cancelDrag_(event);
  }

  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * Sets the direction in which the component can be dragged.
   * Only 'x' or 'y' will lock the movements to those directions.
   * Anything else will be considered free movement
   * @param {string} axis
   */
  set moveFreedom(axis) {
    this.degreesOfFreedom_ = axis;
    // Make sure we update the existing movement.
    if (!this.isLocked_) {
      this.lock();
      this.unlock();
    }
  }

  /**
   * Get the direction in which this component can move.
   * @return {string}
   */
  get moveFreedom() {
    return this.degreesOfFreedom_
  }


  //--------------------------------------------------------------[ Override ]--
  /**
   * @inheritDoc
   */
  executeBeforeReady() {
    this.unlock();
    super.executeBeforeReady();
  }

  //------------------------------------------------------[ Dragger Specific ]--
  /**
   * Make the component draggable
   */
  unlock() {
    const wrapperFunc = func => e => {
      this.cancelDrag_ = func(e);
    };
    if (this.isInDocument && this.isLocked_) {
      const onMove = makeEmitter(this, UiEventType.COMP_DRAG_MOVE);
      const onStart = makeEmitter(this, UiEventType.COMP_DRAG_START);
      const onEnd = makeEmitter(this, UiEventType.COMP_DRAG_END);
      const dragFunc = dragStartListener(
          onStart, onMove, onEnd, this.degreesOfFreedom_);
      this.isLocked_ = false;
      this.dragHandle_ = /** @type {!Node} */ (
          this.dragHandle_ || this.getElement());
      this.listen(this.dragHandle_, EV.MOUSEDOWN, wrapperFunc(dragFunc));
      this.listen(this.dragHandle_, EV.TOUCHSTART, dragFunc);
      this.dragHandle_.classList.remove('locked');
    }
  }

  /**
   * Lock the component in place.
   * Removes all the listeners added when it was made draggable.
   */
  lock() {
    this.stopListeningTo(this.dragHandle_, EV.MOUSEDOWN);
    this.stopListeningTo(this.dragHandle_, EV.TOUCHSTART);
    this.isLocked_ = true;
    this.dragHandle_.classList.add('locked');
  }
}

/**
 * A regular expression for breaking a URI into its component parts.
 *
 * {@link http://www.ietf.org/rfc/rfc3986.txt} says in Appendix B
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * The regular expression has been modified slightly to expose the
 * userInfo, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       userInfo -\
 *    $3 = www.ics.uci.edu   domain     | authority
 *    $4 = <undefined>       port     -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 * @type {!RegExp}
 * @private
 */
const splitRe_ = new RegExp(
    '^' +
    '(?:' +
    '([^:/?#.]+)' +  // scheme - ignore special characters
    // used by other URL parts such as :,
    // ?, /, #, and .
    ':)?' +
    '(?://' +
    '(?:([^/?#]*)@)?' +  // userInfo
    '([^/#?]*?)' +       // domain
    '(?::([0-9]+))?' +   // port
    '(?=[/#?]|$)' +      // authority-terminating character
    ')?' +
    '([^?#]+)?' +          // path
    '(?:\\?([^#]*))?' +    // query
    '(?:#([\\s\\S]*))?' +  // fragment
    '$');


/**
 * The index of each URI component in the return value of goog.uri.utils.split.
 * @enum {number}
 */
const ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};


/**
 * Splits a URI into its component parts.
 *
 * Each component can be accessed via the component indices; for example:
 * <pre>
 * goog.uri.utils.split(someStr)[goog.uri.utils.ComponentIndex.QUERY_DATA];
 * </pre>
 *
 * @param {string} uri The URI string to examine.
 * @return {!Array<string|undefined>} Each component still URI-encoded.
 *     Each component that is present will contain the encoded value, whereas
 *     components that are not present will be undefined or empty, depending
 *     on the browser's regular expression implementation.  Never null, since
 *     arbitrary strings may still look like path names.
 */
const split = uri => {
  // See @return comment -- never null.
  return /** @type {!Array<string|undefined>} */ (
      uri.match(splitRe_));
};


/**
 * Decodes a value or returns the empty string if it isn't defined or empty.
 * @throws URIError If decodeURIComponent fails to decode val.
 * @param {string|undefined} val Value to decode.
 * @param {boolean=} opt_preserveReserved If true, restricted characters will
 *     not be decoded.
 * @return {string} Decoded value.
 * @private
 */
const decodeOrEmpty_ = (val, opt_preserveReserved) => {
  // Don't use UrlDecode() here because val is not a query parameter.
  if (!val) {
    return '';
  }

  // decodeURI has the same output for '%2f' and '%252f'. We double encode %25
  // so that we can distinguish between the 2 inputs. This is later undone by
  // removeDoubleEncoding_.
  return opt_preserveReserved ? decodeURI(val.replace(/%25/g, '%2525')) :
      decodeURIComponent(val);
};


const getPath = uri => decodeOrEmpty_(split(uri)[ComponentIndex.PATH], true);

const objectToUrlParms = obj => [...Object.entries(obj)].map(
    e => `${e[0]}=${e[1]}`).join('&');

var uriUtils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  objectToUrlParms: objectToUrlParms,
  getPath: getPath
});

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
 * @return {!RequestInit}
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
 * @param {string} jwt A JWT token
 * @param {Object} obj
 * @return {!RequestInit}
 */
const jsonDelInit = (jwt, obj) => jsonInit(jwt, obj, 'DELETE');


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
 * @param {AbortSignal|undefined} signal
 * @return {!RequestInit}
 */
const basicGetInit = (jwt, signal = void 0) => {
  const h = new Headers();
  h.append('Authorization', `bearer ${jwt}`);
  h.append('X-Requested-With', 'XMLHttpRequest');
  const options = {
    cache: 'no-cache',
    headers: h,
    credentials: 'include'
  };
  if (signal) {
    options.signal = signal;
  }
  return options
};


/**
 * A class to manage the setting and getting of permissions.
 */
class UserManager {


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
        .then(getTextOrJson)
        .then(processSubmitReply)
        .catch(err => {
          stopSpin('');
          console.error('Form submit error', err);
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
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  fetch(uri, signal = void 0) {
    const req = new Request(uri.toString());
    return startSpin()
        .then(() => fetch(req, basicGetInit(this.jwt, signal)))
        .then(checkStatus)
        .then(stopSpin)
        .then(getText)
        .catch(err => {
          stopSpin('');
          if (err.name !== 'AbortError') {
            console.error('UMan Text GET Fetch:', uri, err);
          }
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
   * @param {AbortSignal|undefined} signal
   * @return {Promise}
   */
  fetchJson(uri, signal = void 0) {
    const req = new Request(uri.toString());
    return startSpin()
        .then(() => fetch(req, basicGetInit(this.jwt, signal)))
        .then(checkStatus)
        .then(stopSpin)
        .then(getJson)
        .catch(err => {
          stopSpin('');
          if (err.name !== 'AbortError') {
            console.log('UMan JSON GET Fetch:', uri,  err);
          }
          return {};
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
        .catch(err => console.error('UMan JSON PATCH Fetch:', uri, err));
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
        .catch(err => console.error('UMan JSON POST Fetch:', uri, err));
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @return {Promise}
   */
  putJson(uri, payload) {
    const req = new Request(uri.toString());
    return fetch(req, jsonPutInit(this.jwt, payload))
        .then(checkStatus)
        .then(getJson)
        .catch(err => console.error('UMan JSON PUT Fetch:', uri, err));
  };

  /**
   * @param {string} uri
   * @param {Object} payload
   * @return {Promise}
   */
  delJson(uri, payload) {
    const req = new Request(uri.toString());
    return fetch(req, jsonDelInit(this.jwt, payload))
        .then(checkStatus)
        .then(getJson)
        .catch(err => console.error('UMan JSON DELETE Fetch:', uri, err));
  };
}

/**
 * {@link https://material.io/develop/web/components/ripples/}
 * @param {Panel} panel
 */
const renderRipples = function(panel) {
  [...panel.querySelectorAll('.mdc-ripple-surface')].forEach(
      mdc.ripple.MDCRipple.attachTo);
};


/**
 * {@link https://material.io/develop/web/components/buttons/}
 * @param {Panel} panel
 */
const renderButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-button')].forEach(el => {
    mdc.ripple.MDCRipple.attachTo(el);
    this.listen(el, 'click', e => {
      // e.stopPropagation();
      const trg = e.currentTarget;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
      }, elDataMap));
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/buttons/floating-action-buttons/}
 * @param {Panel} panel
 */
const renderFloatingActionButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-fab')].forEach(el => {
    mdc.ripple.MDCRipple.attachTo(el);
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
};


/**
 * {@link https://material.io/develop/web/components/buttons/icon-buttons/}
 * @param {Panel} panel
 */
const renderIconButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-button:not(.mdc-icon-toggle)')].forEach(el => {
    const b = new mdc.ripple.MDCRipple(el);
    b.unbounded = true;
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
};


/**
 * {@link https://material.io/develop/web/components/buttons/icon-buttons/}
 * @param {Panel} panel
 */
const renderIconToggleButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-toggle')].forEach(el => {
    const _ = new mdc.iconButton.MDCIconButtonToggle(el);
    this.listen(el, 'click', e => e.stopPropagation());
    this.listen(el, 'MDCIconButtonToggle:change', e => {
      e.stopPropagation();
      const trg = e.currentTarget;
      const isOn = e.detail.isOn;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: isOn
      }, elDataMap));
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/tabs/tab-bar/}
 * @param {Panel} panel
 */
const renderTabBars = function(panel) {
  [...panel.querySelectorAll('.mdc-tab-bar')].forEach(el => {
    const tbar = new mdc.tabBar.MDCTabBar(el);
    this.listen(el, 'MDCTabBar:activated', e => {
      const trg = tbar.tabList_[e.detail.index].root_;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href']
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/input-controls/switches/}
 * @param {Panel} panel
 */
const renderSwitches = function(panel) {
  [...panel.querySelectorAll('.mdc-switch')].forEach(el => {
    const trg = el.querySelector('input');
    const elDataMap = getElDataMap(trg);
    this.listen(trg, 'change', e => {
      e.stopPropagation();
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: trg.checked,
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/chips/}
 * @param {Panel} panel
 */
const renderChips = function(panel) {
  [...panel.querySelectorAll('.mdc-chip-set')].forEach(el => {
    const chipSet = mdc.chips.MDCChipSet.attachTo(el);
    chipSet.listen('MDCChip:interaction', e => {
      const chip = chipSet.chips.find(c => c.id === e.detail.chipId);
      const trg = chip.root_;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: chip.selected,
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/menu-surface/}
 * @param {Panel} panel
 */
const renderMenuSurfaces = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface')].forEach(
      mdc.menuSurface.MDCMenuSurface.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/menus/}
 * @param {Panel} panel
 */
const renderMenus = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface--anchor:not(.mdc-select__menu)')].forEach(
      menuButtonEl => {
        const menuEl = menuButtonEl.querySelector('.mdc-menu');
        const corner = getElDataMap(menuEl)['corner'] || 'BOTTOM_START';

        // Make the menu
        const menu = new mdc.menu.MDCMenu(menuEl);
        menu.setAnchorCorner(mdc.menuSurface.Corner[corner]);
        menu.items.forEach(mdc.ripple.MDCRipple.attachTo);
        menu.quickOpen = false;
        menu.listen('click', e => e.stopPropagation());
        menu.listen('MDCMenu:selected', e => {
          e.stopPropagation();
          const trg = e.detail['item'];
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href']
          }, elDataMap));
        });

        // Toggle the menu open or closed from the anchor element.
        menuButtonEl.addEventListener('click', e => {
          return menu.open = !menu.open});
      });
};


/**
 * {@link https://material.io/develop/web/components/lists/}
 * @param {Panel} panel
 */
const renderLists = function(panel) {
  [...panel.querySelectorAll('.mdc-list:not(.mdc-menu__items)')].forEach(el => {
    const list = new mdc.list.MDCList(el);
    list.listElements.forEach(mdc.ripple.MDCRipple.attachTo);
    this.listen(el, 'click', e => {
      const trg = e.target.closest('li');
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href']
      }, elDataMap));
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/input-controls/sliders/}
 * @param {Panel} panel
 */
const renderSliders = function(panel) {
  [...panel.querySelectorAll('.mdc-slider')].forEach(el => {
    const slider = new mdc.slider.MDCSlider(el);
    const elDataMap = getElDataMap(el);
    const inputEl = el.parentElement.querySelector(`#${elDataMap.inputid}`);
    this.listen(el, 'MDCSlider:change', (e) => {
      inputEl.value = slider.value;
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/linear-progress/}
 * @param {Panel} panel
 */
const renderLinearProgress = function(panel) {
  [...panel.querySelectorAll('.mdc-linear-progress')].forEach(el => {
    el.linProg = mdc.linearProgress.MDCLinearProgress.attachTo(el);
  });
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/}
 * @param {Panel} panel
 */
const renderTextFields = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field')].forEach(
      mdc.textField.MDCTextField.attachTo
  );
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/icon/}
 * @param {Panel} panel
 */
const renderTextFieldIcons = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field-icon')].forEach(
      mdc.textField.MDCTextFieldIcon.attachTo
  );
};


/**
 * This whole thing is perfectly horrible!
 * {@link https://material.io/develop/web/components/input-controls/select-menus/}
 * @param {HTMLElement} panel
 */
const renderSelectMenus = function(panel) {
  // Build the select menu items from the actual select options.
  // This just builds the DOM.
  const menuBuilder = (menuUl, htmSelectField) => () => {
    while (menuUl.firstChild) {
      menuUl.removeChild(menuUl.lastChild);
    }
    [...htmSelectField.options].forEach(e => {
      const li = document.createElement('li');
      li.classList.add('mdc-list-item');
      li.dataset.value = e.value;
      if (e.selected) {
        li.classList.add('mdc-list-item--selected');
      }
      const span = document.createElement('span');
      span.classList.add('mdc-list-item__text');
      span.classList.add('z2-list-item-text');
      span.textContent = e.textContent;
      li.appendChild(span);
      menuUl.appendChild(li);
    });
  };

  // Calculate the fixed position and maxHeight of the menu surface.
  const calculatePosition = (anchorEl, toolbarEl) => e => {
    const el = e.target;
    const rect = anchorEl.getBoundingClientRect();
    const rect2 = toolbarEl.getBoundingClientRect();
    const vh = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0);
    const max = vh - rect.bottom - 20;  // Give some space at
                                        // the bottom of the page
    const top = rect.bottom - rect2.top;
    const left = rect.left - rect2.left;
    el.style.cssText = `max-height:${max}px;position:fixed;top:${top}px;left:${left}px;`;
  };

  [...panel.querySelectorAll('.mdc-select')].forEach(e => {
    const menuUl = e.querySelector('ul.mdc-list');
    const menuSurfaceEl = e.querySelector('.mdc-select__menu');
    const htmSelectField = e.querySelector('select');

    // We need to control the position of the menu surface.
    const anchorEl = e.querySelector('.mdc-select__anchor');
    const toolbarEl = panel.querySelector('.tst__toolbar');
    const calcPos = calculatePosition(anchorEl, toolbarEl);

    // Instantiate the MDCSelect component.
    // This adds the elements to the DOM
    const mdcSelect = new mdc.select.MDCSelect(e);

    // Get a handle on the menu component, as we want
    // to listen for when it opens.
    const menu = mdcSelect.menu_;
    menu.setFixedPosition(true);

    // We park some accessors on the select field itself
    // This is so that we can manipulate the dropdowns from the outside i.e
    // if you would like the dropdown to dynamically update depending
    // on some other event.
    const mb = menuBuilder(menuUl, htmSelectField);
    htmSelectField.buildMenu = () => {
      mb();
      try {
        mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;
      } catch (e) {
        //  No op.
      }
    };
    htmSelectField.buildMenu();

    // Match the selected indexes, and listen for changes on the MDC component
    // so we can update the real form component.
    mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;

    // This fires twice for some reason :(
    mdcSelect.listen('MDCSelect:change', () => {
      htmSelectField.options[mdcSelect.selectedIndex].selected = true;
      htmSelectField.dispatchEvent(new Event('custom:select:change'));
    });

    // Wholly override all css on the menu surface each time it opens.
    menu.listen('MDCMenuSurface:opened', calcPos);
  });

};

/**
 * {@link https://material.io/develop/web/components/input-controls/form-fields/}
 * @param {Panel} panel
 */
const renderFormFields = function(panel) {
  [...panel.querySelectorAll(
      '.mdc-form-field:not(.for-radio):not(.for-checkbox)')].forEach(
      mdc.formField.MDCFormField.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/input-controls/radio-buttons/}
 * @param {Panel} panel
 */
const renderRadioButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-radio')].forEach(ff => {
    const formField = new mdc.formField.MDCFormField(ff);
    const radContainerEl = ff.querySelector('.mdc-radio');
    radContainerEl.querySelector(
        'input[type="radio"]').classList.add('mdc-radio__native-control');
    formField.input = new mdc.radio.MDCRadio(radContainerEl);
  });
};

/**
 * {@link https://material.io/develop/web/components/input-controls/checkboxes/}
 * @param {Panel} panel
 */
const renderCheckBoxes = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-checkbox')].forEach(ff => {
    const cbEl = ff.querySelector('.mdc-checkbox');
    const checkBox = new mdc.checkbox.MDCCheckbox(cbEl);
    const formField = new mdc.formField.MDCFormField(ff);
    formField.input = checkBox;
  });
};

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

        // Modules are just appended to the DOM and does not share scope with
        // the component. However they are appended to this panel's DOM, and will
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
            this.abortController = new AbortController;
        } else {
            this.abortController = {
                signal: void 0,
                abort: () => void 0
            };
        }

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
            return usr.fetch(this.uri_, this.abortController.signal).then(s => {
                if (opt_callback) {
                    opt_callback(this);
                }
                this.onRenderWithTemplateReply(s).catch(err => {
                    if (err.message !== Component.compErrors().ALREADY_DISPOSED) {
                        console.error('RenderWithTemplate Err:', err);
                    }
                });
                return this;
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

    /**
     * Partially replace panel's content.
     * @param content
     * @param qs
     */
    onReplacePartialDom(content, qs) {
        const replacementContent = content.html.querySelector(qs);
        const target = this.getElement().querySelector(qs);
        target.parentNode.replaceChild(replacementContent, target);

        this.parseContent(replacementContent);
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
                    if (opt_callback) {
                        opt_callback(json, this);
                    }
                    this.onRenderWithJSON(json);
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
    parseContent(panel) {
        // If we are in an environment where MDC is used.

        this.debugMe('Enable interactions. Panel:', panel);

        if (isDefAndNotNull(window.mdc) && window.mdc.hasOwnProperty('autoInit')) {
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
            renderSelectMenus.call(this, panel);
            renderTextFieldIcons.call(this, panel);
            renderTextFields.call(this, panel);
            renderRadioButtons.call(this, panel);
            renderCheckBoxes.call(this, panel);
        }

        // If I am a modal cover (.tst__modal-base), and have the
        // .close_on_click class, then close myself on click.
        if (panel.classList.contains('tst__modal-base') &&
            panel.classList.contains('close_on_click')) {
            this.listen(panel, 'click', e => {
                if (e.target === panel) {
                    this.dispatchPanelEvent('destroy_me');
                }
            });
        }

        [...panel.querySelectorAll('.tst__button:not(.external)')].forEach(el => {
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

        // Get all accordion elements in the panel and add required functionality.
        [...panel.querySelectorAll('.accordion_toggle')].forEach(el => {
            el.addEventListener("click", () => {
                const accordionPanel = el.nextElementSibling;
                if (accordionPanel.style.maxHeight) {
                    accordionPanel.style.maxHeight = null;
                } else {
                    accordionPanel.style.maxHeight = accordionPanel.scrollHeight + "px";
                }
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
        [...panel.querySelectorAll('.zoo_async_json')].forEach(el => {
            const elDataMap = getElDataMap(el);
            const href = elDataMap['href'];
            const onReply = this.onAsyncJsonReply.bind(this, el, elDataMap);
            this.user.fetchJson(href).then(onReply);
            const repeat = toNumber(elDataMap['z_interval']);
            if (isNumber(repeat)) {
                this.doOnBeat(() => {
                    this.user.fetchJson(href).then(onReply);
                }, repeat * 60 * 1000);
            }
        });

        // Grab all elements with a 'zoo_async_html' class.
        // Call the given url, and then populate the calling element with the
        // results. Parse the content and scripts in the context of this panel.
        [...panel.querySelectorAll('.zoo_async_html')].forEach(el => {
            const href = el.getAttribute('data-href');
            this.user.fetchAndSplit(href)
                .then(data => {
                    el.appendChild(data.html);
                    this.parseContent(el);
                    this.evalScripts(data.scripts);
                    this.evalModules(data.modules);
                });
        });
    };

    enterDocument() {
        const panel = this.getElement();
        this.parseContent(panel);
        this.evalScripts(this.responseObject.scripts);
        this.evalModules(this.responseObject.modules);

        // Calling this last makes sure that the final PANEL-READY event really is
        // dispatched right at the end of all of the enterDocument calls.
        // However, note that the async populate is async, and my thus not be
        // completed by the time this fires.
        super.enterDocument();
    };

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
        this.debugMe('PANEL EVENT FIRED. Value:', value, 'Opt DATA:', opt_data);
        return this.dispatchEvent(event);
    };

}

/**
 * A class for managing the display of field level messages on a form.
 */
class FieldErrs {

  constructor(formPanel) {
    this.formPanel_ = formPanel;
    this.fMap = new Map();
    this.form_ = null;
  }

  init() {
    this.form_ = this.formPanel_.formEl;
    if (this.form_) {
      this.form_.addEventListener('change', e => {
        this.validateOnChange(e);
      }, {passive: true});
      this.form_.addEventListener('input', e => {
        this.clearAll();
        this.validateOnChange(e);
      });
      this.form_.addEventListener('invalid', e => {
        e.preventDefault();
        const field = /** @type {HTMLInputElement} */ (e.target);
        this.clearAlertOnField(field);
        this.displayError(field);
      }, {passive: true});
    }
  }

  checkAll() {
    const arr = [...this.form_.elements]
        .map(e => [this.checkValidationForField(e), e])
        .filter(e => !e[0]);
    arr.forEach(e => this.displayError(e[1]));
    return arr.length === 0;
  };

  /**
   * Clear all existing errors
   */
  clearAll() {
    let fields = this.form_ ? this.form_.elements : [];
    [...fields].forEach(field => this.clearAlertOnField(field));

    let nonFieldErrs = this.form_.querySelectorAll(
        '.non-field-errors');
    [...nonFieldErrs].forEach(e => e.classList.remove('alert-error'));

  };

  /**
   * Format the message dom object and insert it into the DOM
   * @param {HTMLInputElement} field The field after which the
   *    alert will be inserted.
   * @param {string} msg The message in the alert.
   * @param {string} css A CSS class name to add to the alert div.
   *      This will be formatted bold.
   */
  displayAlert(field, msg, css) {
    const alertDom = document.getElementById(`${field.id}-helper-text`) ||
        document.createElement('p');
    alertDom.textContent = msg;
    this.fMap.set(field, alertDom);
  };

  /**
   * @param {HTMLInputElement} field
   */
  checkValidationForField(field) {
    this.clearAlertOnField(field);
    let isValid = !field.willValidate;
    if (field.willValidate) {
      isValid = field.checkValidity();
    }
    return isValid;
  };

  /**
   * @param {HTMLInputElement} field
   */
  clearAlertOnField(field) {
    field.classList.remove('error');
    if (this.fMap.has(field)) {
      this.fMap.get(field).textContent = '';
    }
    this.fMap.delete(field);
  };

  /**
   * Display the given error message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string=} opt_msg
   */
  displayError(field, opt_msg) {
    let message = opt_msg || field.validationMessage;
    field.classList.add('error');
    this.displayAlert(field, message, 'alert-error');
  };

  /**
   * Display the given success message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string} message
   */
  displaySuccess(field, message) {
    this.displayAlert(field, message, 'alert-success');
  };

  /**
   * Display the given information message on the given form field.
   * @param {HTMLInputElement} field
   * @param {string} message
   */
  displayInfo(field, message) {
    this.displayAlert(field, message, 'alert-info');
  };

  /**
   * @param {Event} e
   */
  validateOnChange(e) {
    this.checkValidationForField(/** @type {HTMLInputElement} */ (e.target));
  }
}


class FormPanel extends Panel {

  constructor(uri) {
    super(uri);

    /**
     * @type {?HTMLFormElement}
     * @private
     */
    this.form_ = null;

    /**
     * @type {!FieldErrs}
     * @private
     */
    this.fieldErr_ = new FieldErrs(this);

    /**
     * @type {function(!FormPanel, (string|!ServerFormSuccessJsonType)=): (?|null|Promise<?>)}
     */
    this.onSubmitSucFunc = (panel, opt_data) => null;

  }

  /**
   * @return {?HTMLFormElement}
   */
  get formEl() {
      return this.form_;
  }

  /**
   * @inheritDoc
   */
  enterDocument() {
    super.enterDocument();
    this.formIdElementToForm_();
  };


  /**
   * @private
   */
  formIdElementToForm_() {
    this.form_ = this.getFormFromId();
    this.interceptFormSubmit(this.form_);
    this.fieldErr_.init();
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


  /**
   * Given a form id, get the form, and intercept and sterilise its submit.
   * Forms that passed through here will not be able to be submitted with a
   * normal submit button any more, but built in HTML5 Constraint Validation
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
      this.listen(form, 'submit', e => {
        e.preventDefault();
        this.debugMe('Intercepted from SUBMIT');
        if (this.fieldErr_.checkAll()) {
          user && user.formSubmit(this);
        }
      });
    }
    return form;
  };


  //------------------------------------------------------------[ Round Trip ]--
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
          replaceNode(newForm, this.form_);
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
      return usr.fetch(uri).then(s => this.replaceForm(s));
    } else {
      return Promise.reject('No user')
    }
  };

  /**
   * @param {string} reply
   * @return {Promise}
   */
  processSubmitReply(reply) {

    this.fieldErr_.clearAll();
    let success = false;

    if (whatType(reply) === 'object' && reply['success']) {
      return Promise.resolve(this).then(p => {
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
      if (isDefAndNotNull(this.form_)) {
        hasErrors = this.form_.querySelectorAll('.alert-error');
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
      return Promise.resolve(this).then(p => {
        this.onSubmitSucFunc(this);
        this.dispatchCompEvent(UiEventType.FORM_SUBMIT_SUCCESS);
      });
    } else {
      this.debugMe(`
      6.REDIRECTED: ${this.redirected}
      SUCCESS: ${success}`);
      // 'success' flag is not set. The form probably has errors.
      // Reject the promise.
      return Promise.reject('Form has errors');
    }
  };
}

//--------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {!Function} setW
 * @param {!Function} setH
 * @param {!Function} addC
 * @param {number|undefined}width
 * @param {!Array<string>} classArr
 * @return {!Element}
 */
const makeNestEl = (setW, setH, addC, width, classArr) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'relative';
  // el.style.backgroundColor = randomColour();
  if (isDefAndNotNull(width)) {
    el.style.flexBasis = width + 'px';
  } else {
    el.style.flexGrow = 1;
    setW(el, 0);
  }
  setH(el, 'auto', '');
  addC(el);
  classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {function(!Element, number, string=): void} setW
 * @param {function(!Element, number, string=): void} setH
 * @param {function(!Element): void} addC
 * @param {number} thickness
 * @param {!Array<string>} classArr
 * @return {function(): !Element}
 */
const makeDraggerEl = (setW, setH, addC, thickness, classArr) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addC(el);
  classArr.forEach(e => el.classList.add(e));
  setH(el, 100, '%');
  setW(el, thickness);

  // Append an inner grabber.
  const grabber = document.createElement('div');
  grabber.classList.add('grabber');
  addC(grabber);
  el.appendChild(grabber);
  return el;
};


//----------------------------------------------------------[ Event Handlers ]--
const onDraggerEvent = e => {
  const data = e.detail.getData();
  const model = data.component.model;
  switch (e.detail.getValue()) {

    case UiEventType.COMP_DRAG_START:
      // Store a reference to the other nest's current size.
      // We monitor this to detect collisions.
      model.preCollisionOtherSize = model.otherNestSize();
      model.preCollisionOtherOffset = model.otherOffset();
      model.ownDraggerEl.style.zIndex = 1;
      model.otherDraggerEl.style.zIndex = 0;
      model.unClose();
      break;

    case UiEventType.COMP_DRAG_MOVE:
      model.doDrag();
      if (model.collision()) {
        if (!model.colliding) {
          // We entered the colliding state.
          // Take a reference of this position.
          model.onCollisionOwnSize = model.nestSize();
          model.onCollisionOwnOffset = model.ownOffset();
        }
        model.colliding = true;

        // From this point on the drag "feels" elastic.
        model.matchOtherToNest();
        model.otherDragger.model.matchOtherToNest();
      } else {
        if (model.colliding) {
          // We were colliding, but not any more...
          model.matchOtherToNest();
        }
        model.colliding = false;
      }
      break;

    case UiEventType.COMP_DRAG_END:

      if (model.colliding) {
        resizeNest_(
            model.onCollisionOwnOffset,
            model.onCollisionOwnSize,
            data.component,
            false,
            () => {
              model.colliding = false;
              model.preCollisionOtherSize = void 0;
              model.preCollisionOtherOffset = void 0;
              model.onCollisionOwnSize = void 0;
              model.onCollisionOwnOffset = void 0;
              model.otherDragger.model.matchOtherToNest();
            });
        resizeNest_(
            model.preCollisionOtherOffset,
            model.preCollisionOtherSize,
            model.otherDragger,
            false,
            () => {
              model.matchOtherToNest();
            });
      } else {
        // This is the same as match self to nest...
        model.otherDragger.model.matchOtherToNest();
      }
      model.onDragEnd();
      break;
      // Do nothing.
  }
};

const onDoubleClick = component => e => {
  component.model.toggle();
};


//-----------------------------------------------------[ Orientation Helpers ]--
/**
 * @param {string} orient
 * @return {function(!Element): number}
 */
const orientGetElWidth = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     * @return {number}
     */
    f = el => el.getBoundingClientRect().width;
  } else {
    /**
     * @param {!Element} el
     * @return {number}
     */
    f = el => el.getBoundingClientRect().height;
  }
  return f;
};

/**
 * @param {string} orient
 * @return {function(!Element): number}
 */
const orientGetElOffset = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     * @return {number}
     */
    f = el => el.offsetLeft;
  } else {
    /**
     * @param {!Element} el
     * @return {number}
     */
    f = el => el.offsetTop;
  }
  return f;
};

/**
 * @param {string} orient
 * @return {function(!Element, (number|string), string=): void}
 */
const orientSetElWidth = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
    };
  } else {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
    };
  }
  return f;
};

/**
 * @param {string} orient
 * @return {function(!Element, (number|string), string=): void}
 */
const orientSetElHeight = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
    };
  } else {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
    };
  }
  return f;
};

/**
 * @param orient
 * @return {function(!Element, (number|string), string=): void}
 */
const orientSetElOffset = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.left = `${num}${op_unit ? op_unit : 'px'}`;
    };
  } else {
    /**
     * @param {!Element} el
     * @param {number|string} num
     * @param {string=} op_unit
     */
    f = (el, num, op_unit) => {
      el.style.top = `${num}${op_unit ? op_unit : 'px'}`;
    };
  }
  return f;
};

/**
 * @param {string} orient
 * @return {function(!Element): void}
 */
const orientAddOrientClass = orient => {
  let f;
  if (orient === 'EW') {
    /**
     * @param {!Element} el
     */
    f = el => el.classList.add('east-west');
  } else {
    /**
     * @param {!Element} el
     */
    f = el => el.classList.add('north-south');
  }
  return f;
};


/**
 * @param {number} drgOffset Final required position of the dragger
 * @param {number} nestFlexBasis Final required size of the nest
 * @param {Dragger} dragger
 * @param {boolean} isClose True if this is a full close. In those cases we
 *    want to add a class to the nest and dragger to allow closed styling.
 * @param {Function|undefined} opt_onDoneFunc Callback when the resize completed.
 *    This only fires after the transition animation (if any) is done.
 * @param {boolean=} opt_skipTrans True if the transition should be skipped,
 *    and the move done immediately.
 * @private
 */
const resizeNest_ = (drgOffset, nestFlexBasis, dragger, isClose,
                     opt_onDoneFunc, opt_skipTrans) => {

  const model = dragger.model;
  const context = model.context;
  const orientString = model.orient === 'EW' ? 'left' : 'top';
  const drgEl = model.ownDraggerEl;
  const nestEl = model.ownNest;
  const ms = 250;

  // Just set the values. No transitions, no checking of current values.
  if (opt_skipTrans) {
    model.setOwnOffset(drgOffset);
    nestEl.style.flexBasis = `${nestFlexBasis}px`;
    isClose
        ? nestEl.classList.add('closed')
        : nestEl.classList.remove('closed');
    maybeFunc(opt_onDoneFunc)();
  } else {

    let timeoutID;
    const onTransitionEnd = () => {
      context.stopListeningTo(drgEl, EV.TRANSITIONEND);
      context.stopListeningTo(nestEl, EV.TRANSITIONEND);
      drgEl.style.transition = null;
      nestEl.style.transition = null;
      if (isClose) {
        drgEl.classList.add('closed');
        nestEl.classList.add('closed');
      }
      context.refreshAll_();
      maybeFunc(opt_onDoneFunc)();
      window.clearTimeout(timeoutID);
    };

    // Don't even begin this unless we have to.
    // Else you will leak events, as the transition will never start,
    // and thus never end.
    if (model.ownOffset() !== drgOffset) {
      context.listen(drgEl, EV.TRANSITIONEND, onTransitionEnd);
    }

    // A hard stop to make sure we fire what needs to be fired.
    // Will be canceled if the transition end fired before this.
    timeoutID = window.setTimeout(onTransitionEnd, ms + 50);

    drgEl.style.transition = `${orientString} ${ms}ms ease-in-out`;
    nestEl.style.transition = `flex-basis ${ms}ms ease-in-out`;
    nestEl.style.flexBasis = `${nestFlexBasis}px`;
    model.setOwnOffset(drgOffset);
    if (!isClose) {
      nestEl.classList.remove('closed');
      drgEl.classList.remove('closed');
    }
  }

};


//--------------------------------------------------------------[ Main Class ]--
class Split extends Component {

  static splitEventCode() {
    return UiEventType.SPLIT;
  }

  constructor(opt_thickness) {
    super();

    /**
     * The global dragger thickness.
     * @type {number}
     * @private
     */
    this.thickness_ = isNumber(opt_thickness) ? opt_thickness : 12;

    /**
     * Pre-calculated half-width of the draggers
     * @type {number}
     * @private
     */
    this.halfThick_ = this.thickness_ / 2;

    /**
     * Holds reference between the nest designation, and the nest element.
     * @type {!Map<string, !Element>}
     * @private
     */
    this.nestMap_ = new Map();

    /**
     * @type {!Set<!Function>}
     * @private
     */
    this.refreshFuncs_ = new Set();

    /**
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {!Set<!Element>}
     * @private
     */
    this.splitNests_ = new Set();

    /**
     * Map of nest names to methods that move them.
     * @type {Map<string, Function>}
     * @private
     */
    this.resizeFuncs_ = new Map();

    /**
     * Map of nest names to methods that close them.
     * @type {!Map<string, !Function>}
     * @private
     */
    this.closeFuncs_ = new Map();

    /**
     * Map of nest names to the dragger components that affect them.
     * The value of the map is a two-element array. The first element is a
     * string, denoting the orientation ('EW', 'NS') and the second is the
     * actual dragger component.
     * @type {!Map<string, !Array<string|!Dragger>>}
     * @private
     */
    this.draggerMap_ = new Map();

    window.addEventListener('resize', () => this.refreshAll_());
  };

  get nests() {
    return [...this.nestMap_.values()].filter(e => !this.splitNests_.has(e))
  }

  get nestNames() {
    return [...this.nestMap_.entries()]
        .filter(([k,v]) => !this.splitNests_.has(v))
        .map(([k, ]) => k);
  }

  get draggers() {
    return [...this.draggerMap_.values()].map(e => e[1]);
  }

  get NSdraggers() {
    return [...this.draggerMap_.values()]
        .filter(([a,]) => a === 'NS')
        .map(([a, b]) => b);
  }

  /**
   * When the window size changes, refresh the layout.
   * @private
   */
  refreshAll_() {
    for (const f of this.refreshFuncs_) {
      f();
    }
  };

  /**
   * @param s
   * @return {!Element | undefined}
   */
  getNest(s) {
    return this.nestMap_.get(s);
  }

  /**
   * @param s
   * @return {!Element | undefined}
   */
  getNestModel(s) {
    return this.draggerMap_.get(s)[1].model;
  }

  /**
   * Resize a nest.
   * @param {string} s Nest name
   * @param {number} size The required size of the resulting move.
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  resize(s, size, func, opt_skipAni = false) {
    if (this.resizeFuncs_.has(s)) {
      this.resizeFuncs_.get(s)(size, func, opt_skipAni);
    }
  }

  /**
   * Open an closed and locked nest. Simply a convenience method to combine
   * the unlock and resize steps.
   * @param {string} s Nest name
   * @param {number?} size The required size of the resulting move.
   * @param {Function?} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  openAndUnlock(s, size, func, opt_skipAni = false) {
    if (this.resizeFuncs_.has(s)) {
      this.resizeFuncs_.get(s)(
          size,
          () => {this.unlock(s);},
          opt_skipAni);
    }
  }

  /**
   * Close nest. Move it out the way. Once done a 'closed' class is added
   * to the nest and dragger.
   * @param {string} s Nest name
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  close(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(func, opt_skipAni);
    }
  }

  /**
   * Close the nest and lock it. See <@code>lock</>
   * @param {string} s Nest name
   * @param {Function?} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  closeAndLock(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(
          () => {
            this.lock(s);
          }, opt_skipAni);
    }
  }

  closeAndLockAll(func = undefined, opt_skipAni = false) {
    this.nestNames.forEach(n => this.closeAndLock(n, func, opt_skipAni));
  }

  openAndUnlockAll(size = undefined, func = undefined, opt_skipAni = false) {
    this.nestNames.forEach(n => this.openAndUnlock(n, size, func, opt_skipAni));
  }

  /**
   * Lock a dragger. Removes the listeners that make it draggable.
   * Adds the 'locked' class to the element.
   * Sets the element's "display" style to none.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} s Nest name
   */
  lock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].lock();
    }
  }

  /**
   * The reverse of a lock. Removes the classes added by <@code>lock</> and
   * restores the draggable listeners.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} s Nest name
   */
  unlock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].unlock();
    }
  }

  /**
   * Split an element into parts, each separated by a dragger component.
   * The split creates 3 new elements inside root element. Thus it is not
   * truly splitting the reference element, but rather overlaying the
   * split functionality over the reference element.
   * A split can be either horizontal - called "EW" (east-west) or
   * vertical - called "NS" (north-south).
   * By convention the new elements created are called 'nests', and are named
   * in order "A", "B" and "C" respectively.
   * For EW splits the we name from left to right:
   *    A B C
   * For NS splits we name from top to bottom:
   *    A
   *    B
   *    C
   * Each newly created nest is a valid root for further splitting.
   * When a nest is split, the resultant nests names are prepended with the
   * name of the root nest that was split.
   * Example: If nest C is split, the resultant nests are named CA, CB, and CC.
   * When one of these (for example CA) is split further, the pattern continues
   * with the resulting nests being CAA, CAB, CAC etc.
   * @param {Element=} opt_el The element to split. If not given, the
   *    components own element is used. Else, the element is checked to be
   *    a member of this split-group, and if so, is split.
   * @param {string=} orientation Only 'EW' or 'NS'. Defaults to 'EW'
   * @param {Array<number>} limitsA Width of the A nest
   * @param {Array<number>} limitsC Width of the C nest
   */
  addSplit(opt_el = void 0, orientation = 'EW', limitsA = [], limitsC = []) {

    // Sanitize input
    // Clean the orientation.
    const orient = ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    let root = opt_el ? opt_el : this.getElement();
    let refN = '';
    if (opt_el) {
      const match = [...this.nestMap_.entries()].find(([k, v]) => v === opt_el);
      if (match) {
        refN = match[0];
        root = match[1];
      } else {
        return ['Element not managed by this component', opt_el];
      }
    }
    if (this.splitNests_.has(root)) {
      return ['Already used!', root];
    }

    // Make sure the container is flexing.
    root.style.display = 'flex';
    root.style.flexDirection = orient === 'EW' ? 'row' : 'column';
    root.style.overflow = 'hidden';
    root.style.padding = '0';

    // Prep all the orientation helper functions. This reduces the need to
    // further try and keep track of the orientation. From here on we
    // can think in terms of a "EW" layout, and these function will
    // take care of the translation into "NS" or "EW" as needed.
    const getW = orientGetElWidth(orient);
    const getO = orientGetElOffset(orient);
    const setW = orientSetElWidth(orient);
    const setH = orientSetElHeight(orient);
    const setO = orientSetElOffset(orient);
    const addC = orientAddOrientClass(orient);
    const nullFunc = () => null;

    // Dragger thickness.
    const thickness = this.thickness_;
    const hT = this.halfThick_;

    // Nest names.
    const refA = `${refN}A`;
    const refB = `${refN}B`;
    const refC = `${refN}C`;

    // Nest Default size and limits.
    const defSizeA = limitsA[0] || getW(root) / 3;
    const minSizeA = limitsA[1] || 0;
    const maxSizeA = limitsA[2];
    const defSizeC = limitsC[0] || getW(root) / 3;
    const minSizeC = limitsC[1] || 0;
    const maxSizeC = limitsC[2];

    // Make the nest elements
    const a = makeNestEl(setW, setH, addC, defSizeA, ['_A', refA]);
    const b = makeNestEl(setW, setH, addC, void 0, ['_B', refB]);
    const c = makeNestEl(setW, setH, addC, defSizeC, ['_C', refC]);
    [a, b, c].forEach(e => root.appendChild(e));

    // Make the dragger components
    const freedom = orient === 'EW' ? 'x' : 'y';
    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(setW, setH, addC, thickness, ['__A']);
    AB.render(root);
    const ab = /** @type {!Element} */(AB.getElement());

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(setW, setH, addC, thickness, ['__C']);
    BC.render(root);
    const bc = /** @type {!Element} */(BC.getElement());

    // Once rendered, the dragger can be matched the their nests.
    const matchDraggersToNest = () => {
      const aW = getW(a);
      setO(ab, aW - hT);
      setO(bc, aW + getW(b) - hT);
    };
    matchDraggersToNest();

    // Extend the dragger's model with the required info about this setup
    // to be able to do everything it needs functionally.
    AB.model = {
      context: this,
      orient,
      hT,
      defaultSize: defSizeA,
      maxSize: minSizeA,
      minSize: maxSizeA,
      root,
      ownNest: a,
      ownDraggerEl: ab,
      midNest: b,
      otherNest: c,
      otherDraggerEl: bc,
      otherDragger: BC,
      doDrag: () => a.style.flexBasis = getO(ab) + hT + 'px',
      unClose: () => a.classList.remove('closed'),
      matchOtherToNest: () => setO(bc, getW(a) + getW(b) - hT),
      ownOffset: () => getO(ab),
      nestOffset: () => getO(a),
      nestSize: () => getW(a),
      setOwnOffset: n => setO(ab, n),
      rootSize: () => getW(root),
      otherNestSize: () => getW(c),
      otherOffset: () => getO(bc),
      mustOpen: () => getO(ab) <= Math.max(30, minSizeA),
      collision: () => AB.model.preCollisionOtherSize > BC.model.nestSize(),
      toggle: () => AB.model.mustOpen() ? AB.model.resize() : AB.model.close(),
      resize: (value = defSizeA, opt_aF = nullFunc, opt_skipTrans = false) => {
        const doneFunc = () => {
          this.dispatchSplitEvent('didResize', {name: refA});
          maybeFunc(opt_aF)();
        };
        resizeNest_(value, value, AB, false, doneFunc, opt_skipTrans);
      },
      close: (opt_aF = nullFunc, opt_Trans = false) => {
        const doneFunc = () => {
          this.dispatchSplitEvent('didClose', {name: refA});
          maybeFunc(opt_aF)();
        };
        resizeNest_(0, 0, AB, true, doneFunc, opt_Trans);
      },
      onDragEnd: () => {
        this.dispatchSplitEvent('didChange', {names: [refA, refB]});
      }
    };

    BC.model = {
      context: this,
      orient,
      hT,
      defaultSize: defSizeC,
      maxSize: minSizeC,
      minSize: maxSizeC,
      root,
      ownNest: c,
      ownDraggerEl: bc,
      midNest: b,
      otherNest: a,
      otherDraggerEl: ab,
      otherDragger: AB,
      doDrag: () => c.style.flexBasis = getW(root) - getO(bc) - hT + 'px',
      unClose: () => c.classList.remove('closed'),
      matchOtherToNest: () => setO(ab, getW(a) - hT),
      ownOffset: () => getO(bc),
      nestOffset: () => getO(c),
      nestSize: () => getW(c),
      setOwnOffset: n => setO(bc, n),
      rootSize: () => getW(root),
      otherNestSize: () => getW(a),
      otherOffset: () => getO(ab),
      mustOpen: () => (getW(root) - getO(bc)) <= Math.max(30, minSizeC),
      collision: () => BC.model.preCollisionOtherSize > AB.model.nestSize(),
      toggle: () => BC.model.mustOpen() ? BC.model.resize() : BC.model.close(),
      resize: (value = defSizeC, opt_aF = nullFunc, opt_skipTrans = false) => {
        const doneFunc = () => {
          this.dispatchSplitEvent('didResize', {name: refC});
          maybeFunc(opt_aF)();
        };
        resizeNest_(getW(root) - value, value, BC, false, doneFunc, opt_skipTrans);
      },
      close: (opt_aF = nullFunc, opt_skipTrans = false) => {
        const doneFunc = () => {
          this.dispatchSplitEvent('didClose', {name: refC});
          maybeFunc(opt_aF)();
        };
        resizeNest_(getW(root), 0, BC, true, doneFunc, opt_skipTrans);
      },
      onDragEnd: () => {
        this.dispatchSplitEvent('didChange', {names: [refB, refC]});
      }
    };

    this.listen(AB, Component.compEventCode(), onDraggerEvent);
    this.listen(BC, Component.compEventCode(), onDraggerEvent);
    this.listen(ab, EV.DBLCLICK, onDoubleClick(AB));
    this.listen(bc, EV.DBLCLICK, onDoubleClick(BC));

    // Make these things listen
    [...this.draggerMap_.values()]
        .filter(e => e[0] === orient)
        .map(e => e[1])
        .forEach(e => {
          this.listen(e, Component.compEventCode(), matchDraggersToNest);
        });

    // Park the split so the component getters and setters can get to it.
    this.refreshFuncs_.add(matchDraggersToNest);
    this.draggerMap_.set(refA, [orient, AB]).set(refC, [orient, BC]);
    this.nestMap_.set(refA, a).set(refB, b).set(refC, c);
    this.splitNests_.add(root);
    this.resizeFuncs_
        .set(refA, AB.model.resize)
        .set(refC, BC.model.resize);
    this.closeFuncs_
        .set(refA, AB.model.close)
        .set(refC, BC.model.close);
  }

  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.VIEW} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Component.compEventCode(), e => {
   *      console.log('B got', Component.compEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchSplitEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.SPLIT, dataObj);
    return this.dispatchEvent(event);
  };

}

/**
 * Toggle the whole tree display either open or closed
 * @param {Panel} panel
 * @param {{isOn: boolean}} eventData
 */
const toggleTree = (eventData, panel) => {
  // The first level children. From a pure usability perspective
  // its nicer if we don't to close these. If we did, the tree *always* ends
  // up with only one element revealed. So we keep the first level children
  // open at all times.
  const fc = panel.getElement().querySelector('.children');
  const isOn = /**@type {boolean} */ (eventData.isOn);
  const children = panel.getElement().querySelectorAll('.children');
  const revealIcons = panel.getElement().querySelectorAll('.tst__reveal_icon');
  [...children].forEach(e => enableClass(
      e, 'tst__tree-children__hidden', e !== fc && !isOn));
  [...revealIcons].forEach(e => enableClass(
      e, 'tst__icon_rotated', e !== fc && !isOn));
};


/**
 * @param {Panel} panel
 * @param {{trigger:!HTMLElement}} eventData
 */
const toggleTreeChildren = (panel, eventData) => {
  const revealIcon = eventData.trigger;
  const elId = revealIcon.getAttribute('data-child-id');
  const child = panel.getElement().querySelector(`#${elId}`);
  toggleClass(child, 'tst__tree-children__hidden');
  toggleClass(revealIcon, 'tst__icon_rotated');
};

/**
 * Determine if an element is in the viewport
 * @param  {Node} parent The element
 * @return {function} Returns true if element is in the viewport
 */
const needsToScroll = parent => {
  const parentRect = parent.getBoundingClientRect();
  const bottomMustBeLessThan = parentRect.bottom;
  return elem => {
    const distance = elem.getBoundingClientRect();
    return distance.bottom > bottomMustBeLessThan
  };
};


const treeNodeSelect = panel => id => {
  const treeContainer = panel.getElement().querySelector('.zv_tree_container');
  const isHidden = needsToScroll(treeContainer);
  const allNodes = panel.getElement().querySelectorAll('.tree-node');
  let targetNode = undefined;
  [...allNodes].forEach(n => {
    enableClass(n, 'mdc-list-item--activated', n.id === `tree-node_${id}`);
    if (n.id === `tree-node_${id}`) {
      targetNode = n;
    }
  });

  if (targetNode && isHidden(targetNode)) {
    targetNode.scrollIntoView(false);
  }
};


class View extends EVT {

  //----------------------------------------------------------------[ Static ]--
  static viewEventCode() {
    return UiEventType.VIEW;
  }

  constructor() {
    super();

    /**
     * Set this to true to get some debug in the console.
     * @type {boolean}
     * @private
     */
    this.debugMode_ = false;

    /**
     * @type {Map<string, !Panel>}
     */
    this.panelMap = new Map();

    /**
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;


    this.split_ = void 0;

    this.panelEventMap_ = this.initPanelEventsInternal_();

    this.switchViewMap_ = new Map();

  };

  set split(split) {
    this.split_ = split;
    // this.listen(this.split_, UiEventType.SPLIT, e => {
    //   const eventValue = e.detail.getValue();
    //   const eventData = e.detail.getData();
    //   console.log(eventValue, eventData, this.disposed_, this.constructor.name);
    // });
    // console.log('LISTENRS', this.split_.numListeners)
    // this.split_.isObservedBy_.forEach(e => {
    //   console.log('    ', e.constructor.name, e.disposed_)
    // })
  }

  get split() {
    if (!this.split_) {
      throw 'No SPLIT component available'
    }
    return this.split_;
  }

  /**
   * @param {!UserManager} user
   */
  set user(user) {
    this.user_ = user;
    this.panelMap.forEach(panel => panel.user = user);
  };


  /**
   * @return {!UserManager}
   */
  get user() {
    if (!this.user_) {
      this.user_ = new UserManager();
    }
    return this.user_;
  };


  /**
   * Render each of the panels in this view.
   */
  render() {
    this.initPanelEvents();
    this.preRender();
    this.configurePanels();
    this.displayPanels();
    this.postRender();
  };

  /**
   * Placeholder for subclasses to add panel event functions.
   */
  initPanelEvents() {
  };


  /**
   * Run before the render.
   */
  preRender() {
  };

  /**
   * Placeholder for panel configuration functionality;
   */
  configurePanels() {
  }

  /**
   * Placeholder for panel display functionality;
   */
  displayPanels() {
  }

  /**
   * Placeholder for post render functionality.
   */
  postRender() {
  }


  /**
   * @inheritDoc
   */
  dispose() {
    [...this.panelMap.values()].forEach(panel => panel.dispose());
    super.dispose();
  };


  /**
   * Add a panel as a child of the view.
   * @param {string} name The name of the panel - used as a key in the panel map.
   * @param {!Panel} panel The panel itself.
   */
  addPanelToView(name, panel) {
    panel.user = this.user;
    this.removePanelByName(name);
    this.panelMap.set(name, panel);
    this.listen(panel, Panel.panelEventCode(), this.onPanelEvent.bind(this));
  };


  /**
   * Remove a panel from the view by name.
   * @param {string} name The name of the panel - used as a key in the panel map.
   */
  removePanelByName(name) {
    this.panelMap.has(name) && this.panelMap.get(name).dispose();
  };

  removePanel(panel) {
    const [n, p] = [...this.panelMap.entries()].find(([k, v]) => v === panel);
    if (n && p) {
      p.dispose();
      this.panelMap.delete(n);
    }
  }


  /**
   * @param {string} name
   * @return {Panel|undefined}
   */
  getPanelByName(name) {
    return this.panelMap.get(name);
  };


  broadcastToPanels(data) {
    [...this.panelMap.values()].forEach(p => p.onViewDataBroadcast(data));
  }


  initPanelEventsInternal_() {
    return new Map()
        .set('toggle_tree', (eventData, ePanel) => {
          toggleTree(eventData, ePanel);
        })
        .set('tree_toggle-children', (eventData, ePanel) => {
          toggleTreeChildren(
              ePanel,
              /**@type {{trigger:!HTMLElement}}*/ (eventData));
        })
        .set('destroy_me', (eventData, ePanel) => {
          this.removePanel(ePanel);
        })
        .set('paginate', (eventData, ePanel) => {
          const href = `${eventData.href}?${eventData.targetval}`;
          this.user.fetchAndSplit(href).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          );
        })
        .set('search', (eventData, ePanel) => {
          let href = `${eventData.href}`;
          const qString = eventData.formData.q;
          const qDict = eventData.targetval;
          if (qString !== '') {
            href = `${href}?q=${qString}`;
          }
          if (qDict !== '') {
            let newQDict = qDict;
            if (qDict.includes('page=')) {
              newQDict = qDict.split('&').filter(e => !e.includes('page=')).join('&');
            }
            href = qString !== '' ? `${href}&${newQDict}` : `${href}?${newQDict}`;
          }
          this.user.fetchAndSplit(href).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          );
        })
        .set('list_filter', (eventData, ePanel) => {
          const href = `${eventData.href}?${eventData.targetval}`;
          this.user.fetchAndSplit(href).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          );
        })
        .set('reset_search', (eventData, ePanel) => {
          // Grab the closest form up the DOM, reset its 'q' field and make
          // it use the normal submit logic.
          const form = eventData.trigger.closest('form');
          form.elements['q'].value = '';
          form.dispatchEvent(new Event('submit'));
        })
        .set('switch_view', (eventData, ePanel) => {
          this.debugMe('switch_view received: eventData', eventData);

          const href = eventData.href;
          const pk = eventData.pk;
          const view = eventData.view;
          const landOn = eventData.landon;
          const landOnPk = eventData.landonpk;
          const displayAs = eventData.displayas;

          if (this.switchViewMap_.has(view)) {
            this.switchViewMap_.get(view)({
              view,
              pk,
              landOn,
              landOnPk,
              displayAs,
              href
            }, ePanel);
          } else {
            this.debugMe('NO VIEW FOUND FOR:', view, this.switchViewMap_);
          }
        });
  };

  mapPanEv(s, func) {
    this.panelEventMap_.set(s, func);
  }

  /**
   * A map of string to function where the function receives an object and
   * a panel.
   * @param {string} s
   * @param {function(
   *  {view:string, pk:string, landOn:string, href:string}, Panel):?} func
   */
  mapSwitchView(s, func) {
    this.switchViewMap_.set(s, func);
  }


  /**
   * @param {!CustomEvent} e
   */
  onPanelEvent(e) {
    const eventValue = e.detail.getValue();
    const eventData = e.detail.getData();
    const ePanel = /** @type {Panel} */ (e.target);
    if (this.panelEventMap_.has(eventValue)) {
      this.panelEventMap_.get(eventValue)(eventData, ePanel);
    } else {
      this.debugMe(`NO EVENT MATCH
          oPe: ${e}
          eventValue: ${eventValue}
          eventData: ${JSON.stringify(eventData, undefined, 2)}
          ePanel: ${ePanel.constructor.name}`);
    }
  };


  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.VIEW} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Component.compEventCode(), e => {
   *      console.log('B got', Component.compEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchViewEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.VIEW, dataObj);
    return this.dispatchEvent(event);
  };

}

class Conductor extends EVT {
  constructor() {
    super();

    this.activeView_ = null;

    /**
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;

    this.split_ = void 0;

    this.viewEventMap_ = this.initViewEventsInternal_();

    this.viewConstructorMap_ = new Map();

  };

  set split(split) {
    this.split_ = split;
  }

  get split() {
    if (!this.split_) {
      throw 'No SPLIT component available'
    }
    return this.split_;
  }


  /**
   * @param {!UserManager} user
   */
  set user(user) {
    this.user_ = user;
    if (this.activeView_) {
      this.activeView_.user = this.user;
    }
  };


  /**
   * @return {!UserManager}
   */
  get user() {
    if (!this.user_) {
      this.user_ = new UserManager();
    }
    return this.user_;
  };


  /**
   * @param {!CustomEvent} e Event object.
   */
  onViewEvent(e) {
    const eventValue = e.detail.getValue();
    const eventData = e.detail.getData();
    const eView = /** @type {Panel} */ (e.target);
    if (this.viewEventMap_.has(eventValue)) {
      this.viewEventMap_.get(eventValue)(eventData, eView);
    } else {
      console.log('Unhandled VIEW Event:', e, eventValue, eventData, eView);
    }
  };

  initViewEventsInternal_() {
    return new Map()
        .set('switch_view', (eventData, eView) => {
          if (this.viewConstructorMap_.has(eventData.view)) {
            const view = this.viewConstructorMap_.get(eventData.view)(
                eventData.pk, eventData);
            this.switchView(view);
          }
        })
  };

  mapViewEv(s, func) {
    this.viewEventMap_.set(s, func);
  }

  registerViewConstructor(s, f) {
    this.viewConstructorMap_.set(s, f);
  }

  /**
   * Make the given view active.
   * @param {!View} view
   */
  setActiveView(view) {
    if (this.activeView_) {
      this.stopListeningTo(this.activeView_);
      this.activeView_.dispose();
      this.activeView_ = null;
      delete this.activeView_;
    }
    this.activeView_ = view;
    this.activeView_.render();
  };

  initView(view) {
    view.user = this.user;
    view.split = this.split;
    // view.switchView = this.switchView.bind(this);
    view.registerViewConstructor = this.registerViewConstructor.bind(this);
    this.listen(view, View.viewEventCode(), this.onViewEvent.bind(this));
    return view;
  }

  //-------------------------------------------------------[ Views Utilities ]--
  /**
   * @param {!View} view The view we want active.
   */
  switchView(view) {
    this.setActiveView(this.initView(view));
  };



}

const zooy = {
  Component,
  Dragger,
  Panel,
  FormPanel,
  Split,
  UserManager,
  View,
  Conductor,
  UiEventType,
  treeNodeSelect,
  domUtils,
  uriUtils,
};

export default zooy;
