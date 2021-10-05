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
 * @type {Array<string>}
 */
const numericString = '0123456789'.split('');

/**
 * @type {Array<string>}
 */
const alphaLower = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * @type {Array<string>}
 */
const alphaUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * @type {Array<string>}
 */
[...alphaLower, ...alphaUpper, ...numericString];

/**
 * @type {Map<string, boolean>}
 */
new Map()
    .set('true', true)
    .set('false', false);


/**
 * @param {*} e
 * @returns {*}
 */
const identity = e => e;


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


//--------------------------------------------------------------[ Conversion ]--
/**
 * @param {string} x
 * @return {string}
 */
const toLowerCase = x => x.toLowerCase();


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


const getElDataMap = el => el ? Object.assign({}, el.dataset || {}) : {};


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
      // hour12: false
      hourCycle: "h23",
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
    const classUpdate = dataMap['zdd_class_update'];
    let units = dataMap['zdd_units'] || '';
    let v = pathOr(undefined, lldRef.split('.'))(json);

    if (isDefAndNotNull(v)) {
      if (parseAs) {
        switch (parseAs) {
          case 'class_update_only':
            break;
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
          case 'pretty-json':
            v = JSON.stringify(v, null, 4);
            break;
          default:
            // Do nothing;
            // We add this identity func else rollup strips the default
            // clause
            v = identity(v);
        }
      }
    }

    if (classUpdate) {
      const [valueAccess, action, name] = classUpdate.split(":");
      let v = pathOr(undefined, valueAccess.split('.'))(json);
      if (isDefAndNotNull(v)) {
        switch (action) {
          case 'swap':
            const regex = /\{}/gi;
            const oldClassName = name.replace(regex, '');
            const newClass = name.replace(regex, v);
            el.classList.remove(...[...el.classList].filter(
                e => e.includes(oldClassName)));
            el.classList.add(newClass);
            break;
          case 'remove_on_data':
            el.classList.remove(name);
            break;
        }
      }
    }

    if (isDefAndNotNull(v) && parseAs !== 'class_update_only') {
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

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFoundation = /** @class */ (function () {
    function MDCFoundation(adapter) {
        if (adapter === void 0) { adapter = {}; }
        this.adapter = adapter;
    }
    Object.defineProperty(MDCFoundation, "cssClasses", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports every
            // CSS class the foundation class needs as a property. e.g. {ACTIVE: 'mdc-component--active'}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "strings", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports all
            // semantic strings as constants. e.g. {ARIA_ROLE: 'tablist'}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "numbers", {
        get: function () {
            // Classes extending MDCFoundation should implement this method to return an object which exports all
            // of its semantic numbers as constants. e.g. {ANIMATION_DELAY_MS: 350}
            return {};
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFoundation, "defaultAdapter", {
        get: function () {
            // Classes extending MDCFoundation may choose to implement this getter in order to provide a convenient
            // way of viewing the necessary methods of an adapter. In the future, this could also be used for adapter
            // validation.
            return {};
        },
        enumerable: true,
        configurable: true
    });
    MDCFoundation.prototype.init = function () {
        // Subclasses should override this method to perform initialization routines (registering events, etc.)
    };
    MDCFoundation.prototype.destroy = function () {
        // Subclasses should override this method to perform de-initialization routines (de-registering events, etc.)
    };
    return MDCFoundation;
}());

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCComponent = /** @class */ (function () {
    function MDCComponent(root, foundation) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        this.root = root;
        this.initialize.apply(this, __spread(args));
        // Note that we initialize foundation here and not within the constructor's default param so that
        // this.root_ is defined and can be used within the foundation class.
        this.foundation =
            foundation === undefined ? this.getDefaultFoundation() : foundation;
        this.foundation.init();
        this.initialSyncWithDOM();
    }
    MDCComponent.attachTo = function (root) {
        // Subclasses which extend MDCBase should provide an attachTo() method that takes a root element and
        // returns an instantiated component with its root set to that element. Also note that in the cases of
        // subclasses, an explicit foundation class will not have to be passed in; it will simply be initialized
        // from getDefaultFoundation().
        return new MDCComponent(root, new MDCFoundation({}));
    };
    /* istanbul ignore next: method param only exists for typing purposes; it does not need to be unit tested */
    MDCComponent.prototype.initialize = function () {
        var _args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _args[_i] = arguments[_i];
        }
        // Subclasses can override this to do any additional setup work that would be considered part of a
        // "constructor". Essentially, it is a hook into the parent constructor before the foundation is
        // initialized. Any additional arguments besides root and foundation will be passed in here.
    };
    MDCComponent.prototype.getDefaultFoundation = function () {
        // Subclasses must override this method to return a properly configured foundation class for the
        // component.
        throw new Error('Subclasses must override getDefaultFoundation to return a properly configured ' +
            'foundation class');
    };
    MDCComponent.prototype.initialSyncWithDOM = function () {
        // Subclasses should override this method if they need to perform work to synchronize with a host DOM
        // object. An example of this would be a form control wrapper that needs to synchronize its internal state
        // to some property or attribute of the host DOM. Please note: this is *not* the place to perform DOM
        // reads/writes that would cause layout / paint, as this is called synchronously from within the constructor.
    };
    MDCComponent.prototype.destroy = function () {
        // Subclasses may implement this method to release any resources / deregister any listeners they have
        // attached. An example of this might be deregistering a resize event from the window object.
        this.foundation.destroy();
    };
    MDCComponent.prototype.listen = function (evtType, handler, options) {
        this.root.addEventListener(evtType, handler, options);
    };
    MDCComponent.prototype.unlisten = function (evtType, handler, options) {
        this.root.removeEventListener(evtType, handler, options);
    };
    /**
     * Fires a cross-browser-compatible custom event from the component root of the given type, with the given data.
     */
    MDCComponent.prototype.emit = function (evtType, evtData, shouldBubble) {
        if (shouldBubble === void 0) { shouldBubble = false; }
        var evt;
        if (typeof CustomEvent === 'function') {
            evt = new CustomEvent(evtType, {
                bubbles: shouldBubble,
                detail: evtData,
            });
        }
        else {
            evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(evtType, shouldBubble, false, evtData);
        }
        this.root.dispatchEvent(evt);
    };
    return MDCComponent;
}());

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssPropertyNameMap = {
    animation: {
        prefixed: '-webkit-animation',
        standard: 'animation',
    },
    transform: {
        prefixed: '-webkit-transform',
        standard: 'transform',
    },
    transition: {
        prefixed: '-webkit-transition',
        standard: 'transition',
    },
};
var jsEventTypeMap = {
    animationend: {
        cssProperty: 'animation',
        prefixed: 'webkitAnimationEnd',
        standard: 'animationend',
    },
    animationiteration: {
        cssProperty: 'animation',
        prefixed: 'webkitAnimationIteration',
        standard: 'animationiteration',
    },
    animationstart: {
        cssProperty: 'animation',
        prefixed: 'webkitAnimationStart',
        standard: 'animationstart',
    },
    transitionend: {
        cssProperty: 'transition',
        prefixed: 'webkitTransitionEnd',
        standard: 'transitionend',
    },
};
function isWindow(windowObj) {
    return Boolean(windowObj.document) && typeof windowObj.document.createElement === 'function';
}
function getCorrectPropertyName(windowObj, cssProperty) {
    if (isWindow(windowObj) && cssProperty in cssPropertyNameMap) {
        var el = windowObj.document.createElement('div');
        var _a = cssPropertyNameMap[cssProperty], standard = _a.standard, prefixed = _a.prefixed;
        var isStandard = standard in el.style;
        return isStandard ? standard : prefixed;
    }
    return cssProperty;
}
function getCorrectEventName(windowObj, eventType) {
    if (isWindow(windowObj) && eventType in jsEventTypeMap) {
        var el = windowObj.document.createElement('div');
        var _a = jsEventTypeMap[eventType], standard = _a.standard, prefixed = _a.prefixed, cssProperty = _a.cssProperty;
        var isStandard = cssProperty in el.style;
        return isStandard ? standard : prefixed;
    }
    return eventType;
}

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Determine whether the current browser supports passive event listeners, and
 * if so, use them.
 */
function applyPassive(globalObj) {
    if (globalObj === void 0) { globalObj = window; }
    return supportsPassiveOption(globalObj) ?
        { passive: true } :
        false;
}
function supportsPassiveOption(globalObj) {
    if (globalObj === void 0) { globalObj = window; }
    // See
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    var passiveSupported = false;
    try {
        var options = {
            // This function will be called when the browser
            // attempts to access the passive property.
            get passive() {
                passiveSupported = true;
                return false;
            }
        };
        var handler = function () { };
        globalObj.document.addEventListener('test', handler, options);
        globalObj.document.removeEventListener('test', handler, options);
    }
    catch (err) {
        passiveSupported = false;
    }
    return passiveSupported;
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * @fileoverview A "ponyfill" is a polyfill that doesn't modify the global prototype chain.
 * This makes ponyfills safer than traditional polyfills, especially for libraries like MDC.
 */
function closest(element, selector) {
    if (element.closest) {
        return element.closest(selector);
    }
    var el = element;
    while (el) {
        if (matches(el, selector)) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}
function matches(element, selector) {
    var nativeMatches = element.matches
        || element.webkitMatchesSelector
        || element.msMatchesSelector;
    return nativeMatches.call(element, selector);
}
/**
 * Used to compute the estimated scroll width of elements. When an element is
 * hidden due to display: none; being applied to a parent element, the width is
 * returned as 0. However, the element will have a true width once no longer
 * inside a display: none context. This method computes an estimated width when
 * the element is hidden or returns the true width when the element is visble.
 * @param {Element} element the element whose width to estimate
 */
function estimateScrollWidth(element) {
    // Check the offsetParent. If the element inherits display: none from any
    // parent, the offsetParent property will be null (see
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent).
    // This check ensures we only clone the node when necessary.
    var htmlEl = element;
    if (htmlEl.offsetParent !== null) {
        return htmlEl.scrollWidth;
    }
    var clone = htmlEl.cloneNode(true);
    clone.style.setProperty('position', 'absolute');
    clone.style.setProperty('transform', 'translate(-9999px, -9999px)');
    document.documentElement.appendChild(clone);
    var scrollWidth = clone.scrollWidth;
    document.documentElement.removeChild(clone);
    return scrollWidth;
}

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$o = {
    // Ripple is a special case where the "root" component is really a "mixin" of sorts,
    // given that it's an 'upgrade' to an existing component. That being said it is the root
    // CSS class that all other CSS classes derive from.
    BG_FOCUSED: 'mdc-ripple-upgraded--background-focused',
    FG_ACTIVATION: 'mdc-ripple-upgraded--foreground-activation',
    FG_DEACTIVATION: 'mdc-ripple-upgraded--foreground-deactivation',
    ROOT: 'mdc-ripple-upgraded',
    UNBOUNDED: 'mdc-ripple-upgraded--unbounded',
};
var strings$r = {
    VAR_FG_SCALE: '--mdc-ripple-fg-scale',
    VAR_FG_SIZE: '--mdc-ripple-fg-size',
    VAR_FG_TRANSLATE_END: '--mdc-ripple-fg-translate-end',
    VAR_FG_TRANSLATE_START: '--mdc-ripple-fg-translate-start',
    VAR_LEFT: '--mdc-ripple-left',
    VAR_TOP: '--mdc-ripple-top',
};
var numbers$9 = {
    DEACTIVATION_TIMEOUT_MS: 225,
    FG_DEACTIVATION_MS: 150,
    INITIAL_ORIGIN_SCALE: 0.6,
    PADDING: 10,
    TAP_DELAY_MS: 300,
};

/**
 * Stores result from supportsCssVariables to avoid redundant processing to
 * detect CSS custom variable support.
 */
var supportsCssVariables_;
function supportsCssVariables(windowObj, forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    var CSS = windowObj.CSS;
    var supportsCssVars = supportsCssVariables_;
    if (typeof supportsCssVariables_ === 'boolean' && !forceRefresh) {
        return supportsCssVariables_;
    }
    var supportsFunctionPresent = CSS && typeof CSS.supports === 'function';
    if (!supportsFunctionPresent) {
        return false;
    }
    var explicitlySupportsCssVars = CSS.supports('--css-vars', 'yes');
    // See: https://bugs.webkit.org/show_bug.cgi?id=154669
    // See: README section on Safari
    var weAreFeatureDetectingSafari10plus = (CSS.supports('(--css-vars: yes)') &&
        CSS.supports('color', '#00000000'));
    supportsCssVars =
        explicitlySupportsCssVars || weAreFeatureDetectingSafari10plus;
    if (!forceRefresh) {
        supportsCssVariables_ = supportsCssVars;
    }
    return supportsCssVars;
}
function getNormalizedEventCoords(evt, pageOffset, clientRect) {
    if (!evt) {
        return { x: 0, y: 0 };
    }
    var x = pageOffset.x, y = pageOffset.y;
    var documentX = x + clientRect.left;
    var documentY = y + clientRect.top;
    var normalizedX;
    var normalizedY;
    // Determine touch point relative to the ripple container.
    if (evt.type === 'touchstart') {
        var touchEvent = evt;
        normalizedX = touchEvent.changedTouches[0].pageX - documentX;
        normalizedY = touchEvent.changedTouches[0].pageY - documentY;
    }
    else {
        var mouseEvent = evt;
        normalizedX = mouseEvent.pageX - documentX;
        normalizedY = mouseEvent.pageY - documentY;
    }
    return { x: normalizedX, y: normalizedY };
}

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// Activation events registered on the root element of each instance for activation
var ACTIVATION_EVENT_TYPES = [
    'touchstart', 'pointerdown', 'mousedown', 'keydown',
];
// Deactivation events registered on documentElement when a pointer-related down event occurs
var POINTER_DEACTIVATION_EVENT_TYPES = [
    'touchend', 'pointerup', 'mouseup', 'contextmenu',
];
// simultaneous nested activations
var activatedTargets = [];
var MDCRippleFoundation = /** @class */ (function (_super) {
    __extends(MDCRippleFoundation, _super);
    function MDCRippleFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCRippleFoundation.defaultAdapter), adapter)) || this;
        _this.activationAnimationHasEnded_ = false;
        _this.activationTimer_ = 0;
        _this.fgDeactivationRemovalTimer_ = 0;
        _this.fgScale_ = '0';
        _this.frame_ = { width: 0, height: 0 };
        _this.initialSize_ = 0;
        _this.layoutFrame_ = 0;
        _this.maxRadius_ = 0;
        _this.unboundedCoords_ = { left: 0, top: 0 };
        _this.activationState_ = _this.defaultActivationState_();
        _this.activationTimerCallback_ = function () {
            _this.activationAnimationHasEnded_ = true;
            _this.runDeactivationUXLogicIfReady_();
        };
        _this.activateHandler_ = function (e) { return _this.activate_(e); };
        _this.deactivateHandler_ = function () { return _this.deactivate_(); };
        _this.focusHandler_ = function () { return _this.handleFocus(); };
        _this.blurHandler_ = function () { return _this.handleBlur(); };
        _this.resizeHandler_ = function () { return _this.layout(); };
        return _this;
    }
    Object.defineProperty(MDCRippleFoundation, "cssClasses", {
        get: function () {
            return cssClasses$o;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "strings", {
        get: function () {
            return strings$r;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "numbers", {
        get: function () {
            return numbers$9;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRippleFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                browserSupportsCssVars: function () { return true; },
                computeBoundingRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                containsEventTarget: function () { return true; },
                deregisterDocumentInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                deregisterResizeHandler: function () { return undefined; },
                getWindowPageOffset: function () { return ({ x: 0, y: 0 }); },
                isSurfaceActive: function () { return true; },
                isSurfaceDisabled: function () { return true; },
                isUnbounded: function () { return true; },
                registerDocumentInteractionHandler: function () { return undefined; },
                registerInteractionHandler: function () { return undefined; },
                registerResizeHandler: function () { return undefined; },
                removeClass: function () { return undefined; },
                updateCssVariable: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCRippleFoundation.prototype.init = function () {
        var _this = this;
        var supportsPressRipple = this.supportsPressRipple_();
        this.registerRootHandlers_(supportsPressRipple);
        if (supportsPressRipple) {
            var _a = MDCRippleFoundation.cssClasses, ROOT_1 = _a.ROOT, UNBOUNDED_1 = _a.UNBOUNDED;
            requestAnimationFrame(function () {
                _this.adapter.addClass(ROOT_1);
                if (_this.adapter.isUnbounded()) {
                    _this.adapter.addClass(UNBOUNDED_1);
                    // Unbounded ripples need layout logic applied immediately to set coordinates for both shade and ripple
                    _this.layoutInternal_();
                }
            });
        }
    };
    MDCRippleFoundation.prototype.destroy = function () {
        var _this = this;
        if (this.supportsPressRipple_()) {
            if (this.activationTimer_) {
                clearTimeout(this.activationTimer_);
                this.activationTimer_ = 0;
                this.adapter.removeClass(MDCRippleFoundation.cssClasses.FG_ACTIVATION);
            }
            if (this.fgDeactivationRemovalTimer_) {
                clearTimeout(this.fgDeactivationRemovalTimer_);
                this.fgDeactivationRemovalTimer_ = 0;
                this.adapter.removeClass(MDCRippleFoundation.cssClasses.FG_DEACTIVATION);
            }
            var _a = MDCRippleFoundation.cssClasses, ROOT_2 = _a.ROOT, UNBOUNDED_2 = _a.UNBOUNDED;
            requestAnimationFrame(function () {
                _this.adapter.removeClass(ROOT_2);
                _this.adapter.removeClass(UNBOUNDED_2);
                _this.removeCssVars_();
            });
        }
        this.deregisterRootHandlers_();
        this.deregisterDeactivationHandlers_();
    };
    /**
     * @param evt Optional event containing position information.
     */
    MDCRippleFoundation.prototype.activate = function (evt) {
        this.activate_(evt);
    };
    MDCRippleFoundation.prototype.deactivate = function () {
        this.deactivate_();
    };
    MDCRippleFoundation.prototype.layout = function () {
        var _this = this;
        if (this.layoutFrame_) {
            cancelAnimationFrame(this.layoutFrame_);
        }
        this.layoutFrame_ = requestAnimationFrame(function () {
            _this.layoutInternal_();
            _this.layoutFrame_ = 0;
        });
    };
    MDCRippleFoundation.prototype.setUnbounded = function (unbounded) {
        var UNBOUNDED = MDCRippleFoundation.cssClasses.UNBOUNDED;
        if (unbounded) {
            this.adapter.addClass(UNBOUNDED);
        }
        else {
            this.adapter.removeClass(UNBOUNDED);
        }
    };
    MDCRippleFoundation.prototype.handleFocus = function () {
        var _this = this;
        requestAnimationFrame(function () { return _this.adapter.addClass(MDCRippleFoundation.cssClasses.BG_FOCUSED); });
    };
    MDCRippleFoundation.prototype.handleBlur = function () {
        var _this = this;
        requestAnimationFrame(function () { return _this.adapter.removeClass(MDCRippleFoundation.cssClasses.BG_FOCUSED); });
    };
    /**
     * We compute this property so that we are not querying information about the client
     * until the point in time where the foundation requests it. This prevents scenarios where
     * client-side feature-detection may happen too early, such as when components are rendered on the server
     * and then initialized at mount time on the client.
     */
    MDCRippleFoundation.prototype.supportsPressRipple_ = function () {
        return this.adapter.browserSupportsCssVars();
    };
    MDCRippleFoundation.prototype.defaultActivationState_ = function () {
        return {
            activationEvent: undefined,
            hasDeactivationUXRun: false,
            isActivated: false,
            isProgrammatic: false,
            wasActivatedByPointer: false,
            wasElementMadeActive: false,
        };
    };
    /**
     * supportsPressRipple Passed from init to save a redundant function call
     */
    MDCRippleFoundation.prototype.registerRootHandlers_ = function (supportsPressRipple) {
        var _this = this;
        if (supportsPressRipple) {
            ACTIVATION_EVENT_TYPES.forEach(function (evtType) {
                _this.adapter.registerInteractionHandler(evtType, _this.activateHandler_);
            });
            if (this.adapter.isUnbounded()) {
                this.adapter.registerResizeHandler(this.resizeHandler_);
            }
        }
        this.adapter.registerInteractionHandler('focus', this.focusHandler_);
        this.adapter.registerInteractionHandler('blur', this.blurHandler_);
    };
    MDCRippleFoundation.prototype.registerDeactivationHandlers_ = function (evt) {
        var _this = this;
        if (evt.type === 'keydown') {
            this.adapter.registerInteractionHandler('keyup', this.deactivateHandler_);
        }
        else {
            POINTER_DEACTIVATION_EVENT_TYPES.forEach(function (evtType) {
                _this.adapter.registerDocumentInteractionHandler(evtType, _this.deactivateHandler_);
            });
        }
    };
    MDCRippleFoundation.prototype.deregisterRootHandlers_ = function () {
        var _this = this;
        ACTIVATION_EVENT_TYPES.forEach(function (evtType) {
            _this.adapter.deregisterInteractionHandler(evtType, _this.activateHandler_);
        });
        this.adapter.deregisterInteractionHandler('focus', this.focusHandler_);
        this.adapter.deregisterInteractionHandler('blur', this.blurHandler_);
        if (this.adapter.isUnbounded()) {
            this.adapter.deregisterResizeHandler(this.resizeHandler_);
        }
    };
    MDCRippleFoundation.prototype.deregisterDeactivationHandlers_ = function () {
        var _this = this;
        this.adapter.deregisterInteractionHandler('keyup', this.deactivateHandler_);
        POINTER_DEACTIVATION_EVENT_TYPES.forEach(function (evtType) {
            _this.adapter.deregisterDocumentInteractionHandler(evtType, _this.deactivateHandler_);
        });
    };
    MDCRippleFoundation.prototype.removeCssVars_ = function () {
        var _this = this;
        var rippleStrings = MDCRippleFoundation.strings;
        var keys = Object.keys(rippleStrings);
        keys.forEach(function (key) {
            if (key.indexOf('VAR_') === 0) {
                _this.adapter.updateCssVariable(rippleStrings[key], null);
            }
        });
    };
    MDCRippleFoundation.prototype.activate_ = function (evt) {
        var _this = this;
        if (this.adapter.isSurfaceDisabled()) {
            return;
        }
        var activationState = this.activationState_;
        if (activationState.isActivated) {
            return;
        }
        // Avoid reacting to follow-on events fired by touch device after an already-processed user interaction
        var previousActivationEvent = this.previousActivationEvent_;
        var isSameInteraction = previousActivationEvent && evt !== undefined && previousActivationEvent.type !== evt.type;
        if (isSameInteraction) {
            return;
        }
        activationState.isActivated = true;
        activationState.isProgrammatic = evt === undefined;
        activationState.activationEvent = evt;
        activationState.wasActivatedByPointer = activationState.isProgrammatic ? false : evt !== undefined && (evt.type === 'mousedown' || evt.type === 'touchstart' || evt.type === 'pointerdown');
        var hasActivatedChild = evt !== undefined &&
            activatedTargets.length > 0 &&
            activatedTargets.some(function (target) { return _this.adapter.containsEventTarget(target); });
        if (hasActivatedChild) {
            // Immediately reset activation state, while preserving logic that prevents touch follow-on events
            this.resetActivationState_();
            return;
        }
        if (evt !== undefined) {
            activatedTargets.push(evt.target);
            this.registerDeactivationHandlers_(evt);
        }
        activationState.wasElementMadeActive = this.checkElementMadeActive_(evt);
        if (activationState.wasElementMadeActive) {
            this.animateActivation_();
        }
        requestAnimationFrame(function () {
            // Reset array on next frame after the current event has had a chance to bubble to prevent ancestor ripples
            activatedTargets = [];
            if (!activationState.wasElementMadeActive
                && evt !== undefined
                && (evt.key === ' ' || evt.keyCode === 32)) {
                // If space was pressed, try again within an rAF call to detect :active, because different UAs report
                // active states inconsistently when they're called within event handling code:
                // - https://bugs.chromium.org/p/chromium/issues/detail?id=635971
                // - https://bugzilla.mozilla.org/show_bug.cgi?id=1293741
                // We try first outside rAF to support Edge, which does not exhibit this problem, but will crash if a CSS
                // variable is set within a rAF callback for a submit button interaction (#2241).
                activationState.wasElementMadeActive = _this.checkElementMadeActive_(evt);
                if (activationState.wasElementMadeActive) {
                    _this.animateActivation_();
                }
            }
            if (!activationState.wasElementMadeActive) {
                // Reset activation state immediately if element was not made active.
                _this.activationState_ = _this.defaultActivationState_();
            }
        });
    };
    MDCRippleFoundation.prototype.checkElementMadeActive_ = function (evt) {
        return (evt !== undefined && evt.type === 'keydown') ?
            this.adapter.isSurfaceActive() :
            true;
    };
    MDCRippleFoundation.prototype.animateActivation_ = function () {
        var _this = this;
        var _a = MDCRippleFoundation.strings, VAR_FG_TRANSLATE_START = _a.VAR_FG_TRANSLATE_START, VAR_FG_TRANSLATE_END = _a.VAR_FG_TRANSLATE_END;
        var _b = MDCRippleFoundation.cssClasses, FG_DEACTIVATION = _b.FG_DEACTIVATION, FG_ACTIVATION = _b.FG_ACTIVATION;
        var DEACTIVATION_TIMEOUT_MS = MDCRippleFoundation.numbers.DEACTIVATION_TIMEOUT_MS;
        this.layoutInternal_();
        var translateStart = '';
        var translateEnd = '';
        if (!this.adapter.isUnbounded()) {
            var _c = this.getFgTranslationCoordinates_(), startPoint = _c.startPoint, endPoint = _c.endPoint;
            translateStart = startPoint.x + "px, " + startPoint.y + "px";
            translateEnd = endPoint.x + "px, " + endPoint.y + "px";
        }
        this.adapter.updateCssVariable(VAR_FG_TRANSLATE_START, translateStart);
        this.adapter.updateCssVariable(VAR_FG_TRANSLATE_END, translateEnd);
        // Cancel any ongoing activation/deactivation animations
        clearTimeout(this.activationTimer_);
        clearTimeout(this.fgDeactivationRemovalTimer_);
        this.rmBoundedActivationClasses_();
        this.adapter.removeClass(FG_DEACTIVATION);
        // Force layout in order to re-trigger the animation.
        this.adapter.computeBoundingRect();
        this.adapter.addClass(FG_ACTIVATION);
        this.activationTimer_ = setTimeout(function () { return _this.activationTimerCallback_(); }, DEACTIVATION_TIMEOUT_MS);
    };
    MDCRippleFoundation.prototype.getFgTranslationCoordinates_ = function () {
        var _a = this.activationState_, activationEvent = _a.activationEvent, wasActivatedByPointer = _a.wasActivatedByPointer;
        var startPoint;
        if (wasActivatedByPointer) {
            startPoint = getNormalizedEventCoords(activationEvent, this.adapter.getWindowPageOffset(), this.adapter.computeBoundingRect());
        }
        else {
            startPoint = {
                x: this.frame_.width / 2,
                y: this.frame_.height / 2,
            };
        }
        // Center the element around the start point.
        startPoint = {
            x: startPoint.x - (this.initialSize_ / 2),
            y: startPoint.y - (this.initialSize_ / 2),
        };
        var endPoint = {
            x: (this.frame_.width / 2) - (this.initialSize_ / 2),
            y: (this.frame_.height / 2) - (this.initialSize_ / 2),
        };
        return { startPoint: startPoint, endPoint: endPoint };
    };
    MDCRippleFoundation.prototype.runDeactivationUXLogicIfReady_ = function () {
        var _this = this;
        // This method is called both when a pointing device is released, and when the activation animation ends.
        // The deactivation animation should only run after both of those occur.
        var FG_DEACTIVATION = MDCRippleFoundation.cssClasses.FG_DEACTIVATION;
        var _a = this.activationState_, hasDeactivationUXRun = _a.hasDeactivationUXRun, isActivated = _a.isActivated;
        var activationHasEnded = hasDeactivationUXRun || !isActivated;
        if (activationHasEnded && this.activationAnimationHasEnded_) {
            this.rmBoundedActivationClasses_();
            this.adapter.addClass(FG_DEACTIVATION);
            this.fgDeactivationRemovalTimer_ = setTimeout(function () {
                _this.adapter.removeClass(FG_DEACTIVATION);
            }, numbers$9.FG_DEACTIVATION_MS);
        }
    };
    MDCRippleFoundation.prototype.rmBoundedActivationClasses_ = function () {
        var FG_ACTIVATION = MDCRippleFoundation.cssClasses.FG_ACTIVATION;
        this.adapter.removeClass(FG_ACTIVATION);
        this.activationAnimationHasEnded_ = false;
        this.adapter.computeBoundingRect();
    };
    MDCRippleFoundation.prototype.resetActivationState_ = function () {
        var _this = this;
        this.previousActivationEvent_ = this.activationState_.activationEvent;
        this.activationState_ = this.defaultActivationState_();
        // Touch devices may fire additional events for the same interaction within a short time.
        // Store the previous event until it's safe to assume that subsequent events are for new interactions.
        setTimeout(function () { return _this.previousActivationEvent_ = undefined; }, MDCRippleFoundation.numbers.TAP_DELAY_MS);
    };
    MDCRippleFoundation.prototype.deactivate_ = function () {
        var _this = this;
        var activationState = this.activationState_;
        // This can happen in scenarios such as when you have a keyup event that blurs the element.
        if (!activationState.isActivated) {
            return;
        }
        var state = __assign({}, activationState);
        if (activationState.isProgrammatic) {
            requestAnimationFrame(function () { return _this.animateDeactivation_(state); });
            this.resetActivationState_();
        }
        else {
            this.deregisterDeactivationHandlers_();
            requestAnimationFrame(function () {
                _this.activationState_.hasDeactivationUXRun = true;
                _this.animateDeactivation_(state);
                _this.resetActivationState_();
            });
        }
    };
    MDCRippleFoundation.prototype.animateDeactivation_ = function (_a) {
        var wasActivatedByPointer = _a.wasActivatedByPointer, wasElementMadeActive = _a.wasElementMadeActive;
        if (wasActivatedByPointer || wasElementMadeActive) {
            this.runDeactivationUXLogicIfReady_();
        }
    };
    MDCRippleFoundation.prototype.layoutInternal_ = function () {
        var _this = this;
        this.frame_ = this.adapter.computeBoundingRect();
        var maxDim = Math.max(this.frame_.height, this.frame_.width);
        // Surface diameter is treated differently for unbounded vs. bounded ripples.
        // Unbounded ripple diameter is calculated smaller since the surface is expected to already be padded appropriately
        // to extend the hitbox, and the ripple is expected to meet the edges of the padded hitbox (which is typically
        // square). Bounded ripples, on the other hand, are fully expected to expand beyond the surface's longest diameter
        // (calculated based on the diagonal plus a constant padding), and are clipped at the surface's border via
        // `overflow: hidden`.
        var getBoundedRadius = function () {
            var hypotenuse = Math.sqrt(Math.pow(_this.frame_.width, 2) + Math.pow(_this.frame_.height, 2));
            return hypotenuse + MDCRippleFoundation.numbers.PADDING;
        };
        this.maxRadius_ = this.adapter.isUnbounded() ? maxDim : getBoundedRadius();
        // Ripple is sized as a fraction of the largest dimension of the surface, then scales up using a CSS scale transform
        var initialSize = Math.floor(maxDim * MDCRippleFoundation.numbers.INITIAL_ORIGIN_SCALE);
        // Unbounded ripple size should always be even number to equally center align.
        if (this.adapter.isUnbounded() && initialSize % 2 !== 0) {
            this.initialSize_ = initialSize - 1;
        }
        else {
            this.initialSize_ = initialSize;
        }
        this.fgScale_ = "" + this.maxRadius_ / this.initialSize_;
        this.updateLayoutCssVars_();
    };
    MDCRippleFoundation.prototype.updateLayoutCssVars_ = function () {
        var _a = MDCRippleFoundation.strings, VAR_FG_SIZE = _a.VAR_FG_SIZE, VAR_LEFT = _a.VAR_LEFT, VAR_TOP = _a.VAR_TOP, VAR_FG_SCALE = _a.VAR_FG_SCALE;
        this.adapter.updateCssVariable(VAR_FG_SIZE, this.initialSize_ + "px");
        this.adapter.updateCssVariable(VAR_FG_SCALE, this.fgScale_);
        if (this.adapter.isUnbounded()) {
            this.unboundedCoords_ = {
                left: Math.round((this.frame_.width / 2) - (this.initialSize_ / 2)),
                top: Math.round((this.frame_.height / 2) - (this.initialSize_ / 2)),
            };
            this.adapter.updateCssVariable(VAR_LEFT, this.unboundedCoords_.left + "px");
            this.adapter.updateCssVariable(VAR_TOP, this.unboundedCoords_.top + "px");
        }
    };
    return MDCRippleFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCRipple = /** @class */ (function (_super) {
    __extends(MDCRipple, _super);
    function MDCRipple() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.disabled = false;
        return _this;
    }
    MDCRipple.attachTo = function (root, opts) {
        if (opts === void 0) { opts = { isUnbounded: undefined }; }
        var ripple = new MDCRipple(root);
        // Only override unbounded behavior if option is explicitly specified
        if (opts.isUnbounded !== undefined) {
            ripple.unbounded = opts.isUnbounded;
        }
        return ripple;
    };
    MDCRipple.createAdapter = function (instance) {
        return {
            addClass: function (className) { return instance.root.classList.add(className); },
            browserSupportsCssVars: function () { return supportsCssVariables(window); },
            computeBoundingRect: function () { return instance.root.getBoundingClientRect(); },
            containsEventTarget: function (target) { return instance.root.contains(target); },
            deregisterDocumentInteractionHandler: function (evtType, handler) {
                return document.documentElement.removeEventListener(evtType, handler, applyPassive());
            },
            deregisterInteractionHandler: function (evtType, handler) {
                return instance.root
                    .removeEventListener(evtType, handler, applyPassive());
            },
            deregisterResizeHandler: function (handler) {
                return window.removeEventListener('resize', handler);
            },
            getWindowPageOffset: function () {
                return ({ x: window.pageXOffset, y: window.pageYOffset });
            },
            isSurfaceActive: function () { return matches(instance.root, ':active'); },
            isSurfaceDisabled: function () { return Boolean(instance.disabled); },
            isUnbounded: function () { return Boolean(instance.unbounded); },
            registerDocumentInteractionHandler: function (evtType, handler) {
                return document.documentElement.addEventListener(evtType, handler, applyPassive());
            },
            registerInteractionHandler: function (evtType, handler) {
                return instance.root
                    .addEventListener(evtType, handler, applyPassive());
            },
            registerResizeHandler: function (handler) {
                return window.addEventListener('resize', handler);
            },
            removeClass: function (className) { return instance.root.classList.remove(className); },
            updateCssVariable: function (varName, value) {
                return instance.root.style.setProperty(varName, value);
            },
        };
    };
    Object.defineProperty(MDCRipple.prototype, "unbounded", {
        get: function () {
            return Boolean(this.unbounded_);
        },
        set: function (unbounded) {
            this.unbounded_ = Boolean(unbounded);
            this.setUnbounded_();
        },
        enumerable: true,
        configurable: true
    });
    MDCRipple.prototype.activate = function () {
        this.foundation.activate();
    };
    MDCRipple.prototype.deactivate = function () {
        this.foundation.deactivate();
    };
    MDCRipple.prototype.layout = function () {
        this.foundation.layout();
    };
    MDCRipple.prototype.getDefaultFoundation = function () {
        return new MDCRippleFoundation(MDCRipple.createAdapter(this));
    };
    MDCRipple.prototype.initialSyncWithDOM = function () {
        var root = this.root;
        this.unbounded = 'mdcRippleIsUnbounded' in root.dataset;
    };
    /**
     * Closure Compiler throws an access control error when directly accessing a
     * protected or private property inside a getter/setter, like unbounded above.
     * By accessing the protected property inside a method, we solve that problem.
     * That's why this function exists.
     */
    MDCRipple.prototype.setUnbounded_ = function () {
        this.foundation.setUnbounded(Boolean(this.unbounded_));
    };
    return MDCRipple;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$n = {
    ANIM_CHECKED_INDETERMINATE: 'mdc-checkbox--anim-checked-indeterminate',
    ANIM_CHECKED_UNCHECKED: 'mdc-checkbox--anim-checked-unchecked',
    ANIM_INDETERMINATE_CHECKED: 'mdc-checkbox--anim-indeterminate-checked',
    ANIM_INDETERMINATE_UNCHECKED: 'mdc-checkbox--anim-indeterminate-unchecked',
    ANIM_UNCHECKED_CHECKED: 'mdc-checkbox--anim-unchecked-checked',
    ANIM_UNCHECKED_INDETERMINATE: 'mdc-checkbox--anim-unchecked-indeterminate',
    BACKGROUND: 'mdc-checkbox__background',
    CHECKED: 'mdc-checkbox--checked',
    CHECKMARK: 'mdc-checkbox__checkmark',
    CHECKMARK_PATH: 'mdc-checkbox__checkmark-path',
    DISABLED: 'mdc-checkbox--disabled',
    INDETERMINATE: 'mdc-checkbox--indeterminate',
    MIXEDMARK: 'mdc-checkbox__mixedmark',
    NATIVE_CONTROL: 'mdc-checkbox__native-control',
    ROOT: 'mdc-checkbox',
    SELECTED: 'mdc-checkbox--selected',
    UPGRADED: 'mdc-checkbox--upgraded',
};
var strings$q = {
    ARIA_CHECKED_ATTR: 'aria-checked',
    ARIA_CHECKED_INDETERMINATE_VALUE: 'mixed',
    DATA_INDETERMINATE_ATTR: 'data-indeterminate',
    NATIVE_CONTROL_SELECTOR: '.mdc-checkbox__native-control',
    TRANSITION_STATE_CHECKED: 'checked',
    TRANSITION_STATE_INDETERMINATE: 'indeterminate',
    TRANSITION_STATE_INIT: 'init',
    TRANSITION_STATE_UNCHECKED: 'unchecked',
};
var numbers$8 = {
    ANIM_END_LATCH_MS: 250,
};

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCCheckboxFoundation = /** @class */ (function (_super) {
    __extends(MDCCheckboxFoundation, _super);
    function MDCCheckboxFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCCheckboxFoundation.defaultAdapter), adapter)) || this;
        _this.currentCheckState_ = strings$q.TRANSITION_STATE_INIT;
        _this.currentAnimationClass_ = '';
        _this.animEndLatchTimer_ = 0;
        _this.enableAnimationEndHandler_ = false;
        return _this;
    }
    Object.defineProperty(MDCCheckboxFoundation, "cssClasses", {
        get: function () {
            return cssClasses$n;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckboxFoundation, "strings", {
        get: function () {
            return strings$q;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckboxFoundation, "numbers", {
        get: function () {
            return numbers$8;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckboxFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                forceLayout: function () { return undefined; },
                hasNativeControl: function () { return false; },
                isAttachedToDOM: function () { return false; },
                isChecked: function () { return false; },
                isIndeterminate: function () { return false; },
                removeClass: function () { return undefined; },
                removeNativeControlAttr: function () { return undefined; },
                setNativeControlAttr: function () { return undefined; },
                setNativeControlDisabled: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCCheckboxFoundation.prototype.init = function () {
        this.currentCheckState_ = this.determineCheckState_();
        this.updateAriaChecked_();
        this.adapter.addClass(cssClasses$n.UPGRADED);
    };
    MDCCheckboxFoundation.prototype.destroy = function () {
        clearTimeout(this.animEndLatchTimer_);
    };
    MDCCheckboxFoundation.prototype.setDisabled = function (disabled) {
        this.adapter.setNativeControlDisabled(disabled);
        if (disabled) {
            this.adapter.addClass(cssClasses$n.DISABLED);
        }
        else {
            this.adapter.removeClass(cssClasses$n.DISABLED);
        }
    };
    /**
     * Handles the animationend event for the checkbox
     */
    MDCCheckboxFoundation.prototype.handleAnimationEnd = function () {
        var _this = this;
        if (!this.enableAnimationEndHandler_) {
            return;
        }
        clearTimeout(this.animEndLatchTimer_);
        this.animEndLatchTimer_ = setTimeout(function () {
            _this.adapter.removeClass(_this.currentAnimationClass_);
            _this.enableAnimationEndHandler_ = false;
        }, numbers$8.ANIM_END_LATCH_MS);
    };
    /**
     * Handles the change event for the checkbox
     */
    MDCCheckboxFoundation.prototype.handleChange = function () {
        this.transitionCheckState_();
    };
    MDCCheckboxFoundation.prototype.transitionCheckState_ = function () {
        if (!this.adapter.hasNativeControl()) {
            return;
        }
        var oldState = this.currentCheckState_;
        var newState = this.determineCheckState_();
        if (oldState === newState) {
            return;
        }
        this.updateAriaChecked_();
        var TRANSITION_STATE_UNCHECKED = strings$q.TRANSITION_STATE_UNCHECKED;
        var SELECTED = cssClasses$n.SELECTED;
        if (newState === TRANSITION_STATE_UNCHECKED) {
            this.adapter.removeClass(SELECTED);
        }
        else {
            this.adapter.addClass(SELECTED);
        }
        // Check to ensure that there isn't a previously existing animation class, in case for example
        // the user interacted with the checkbox before the animation was finished.
        if (this.currentAnimationClass_.length > 0) {
            clearTimeout(this.animEndLatchTimer_);
            this.adapter.forceLayout();
            this.adapter.removeClass(this.currentAnimationClass_);
        }
        this.currentAnimationClass_ = this.getTransitionAnimationClass_(oldState, newState);
        this.currentCheckState_ = newState;
        // Check for parentNode so that animations are only run when the element is attached
        // to the DOM.
        if (this.adapter.isAttachedToDOM() &&
            this.currentAnimationClass_.length > 0) {
            this.adapter.addClass(this.currentAnimationClass_);
            this.enableAnimationEndHandler_ = true;
        }
    };
    MDCCheckboxFoundation.prototype.determineCheckState_ = function () {
        var TRANSITION_STATE_INDETERMINATE = strings$q.TRANSITION_STATE_INDETERMINATE, TRANSITION_STATE_CHECKED = strings$q.TRANSITION_STATE_CHECKED, TRANSITION_STATE_UNCHECKED = strings$q.TRANSITION_STATE_UNCHECKED;
        if (this.adapter.isIndeterminate()) {
            return TRANSITION_STATE_INDETERMINATE;
        }
        return this.adapter.isChecked() ? TRANSITION_STATE_CHECKED :
            TRANSITION_STATE_UNCHECKED;
    };
    MDCCheckboxFoundation.prototype.getTransitionAnimationClass_ = function (oldState, newState) {
        var TRANSITION_STATE_INIT = strings$q.TRANSITION_STATE_INIT, TRANSITION_STATE_CHECKED = strings$q.TRANSITION_STATE_CHECKED, TRANSITION_STATE_UNCHECKED = strings$q.TRANSITION_STATE_UNCHECKED;
        var _a = MDCCheckboxFoundation.cssClasses, ANIM_UNCHECKED_CHECKED = _a.ANIM_UNCHECKED_CHECKED, ANIM_UNCHECKED_INDETERMINATE = _a.ANIM_UNCHECKED_INDETERMINATE, ANIM_CHECKED_UNCHECKED = _a.ANIM_CHECKED_UNCHECKED, ANIM_CHECKED_INDETERMINATE = _a.ANIM_CHECKED_INDETERMINATE, ANIM_INDETERMINATE_CHECKED = _a.ANIM_INDETERMINATE_CHECKED, ANIM_INDETERMINATE_UNCHECKED = _a.ANIM_INDETERMINATE_UNCHECKED;
        switch (oldState) {
            case TRANSITION_STATE_INIT:
                if (newState === TRANSITION_STATE_UNCHECKED) {
                    return '';
                }
                return newState === TRANSITION_STATE_CHECKED ? ANIM_INDETERMINATE_CHECKED : ANIM_INDETERMINATE_UNCHECKED;
            case TRANSITION_STATE_UNCHECKED:
                return newState === TRANSITION_STATE_CHECKED ? ANIM_UNCHECKED_CHECKED : ANIM_UNCHECKED_INDETERMINATE;
            case TRANSITION_STATE_CHECKED:
                return newState === TRANSITION_STATE_UNCHECKED ? ANIM_CHECKED_UNCHECKED : ANIM_CHECKED_INDETERMINATE;
            default: // TRANSITION_STATE_INDETERMINATE
                return newState === TRANSITION_STATE_CHECKED ? ANIM_INDETERMINATE_CHECKED : ANIM_INDETERMINATE_UNCHECKED;
        }
    };
    MDCCheckboxFoundation.prototype.updateAriaChecked_ = function () {
        // Ensure aria-checked is set to mixed if checkbox is in indeterminate state.
        if (this.adapter.isIndeterminate()) {
            this.adapter.setNativeControlAttr(strings$q.ARIA_CHECKED_ATTR, strings$q.ARIA_CHECKED_INDETERMINATE_VALUE);
        }
        else {
            // The on/off state does not need to keep track of aria-checked, since
            // the screenreader uses the checked property on the checkbox element.
            this.adapter.removeNativeControlAttr(strings$q.ARIA_CHECKED_ATTR);
        }
    };
    return MDCCheckboxFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var CB_PROTO_PROPS = ['checked', 'indeterminate'];
var MDCCheckbox = /** @class */ (function (_super) {
    __extends(MDCCheckbox, _super);
    function MDCCheckbox() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.ripple_ = _this.createRipple_();
        return _this;
    }
    MDCCheckbox.attachTo = function (root) {
        return new MDCCheckbox(root);
    };
    Object.defineProperty(MDCCheckbox.prototype, "ripple", {
        get: function () {
            return this.ripple_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckbox.prototype, "checked", {
        get: function () {
            return this.nativeControl_.checked;
        },
        set: function (checked) {
            this.nativeControl_.checked = checked;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckbox.prototype, "indeterminate", {
        get: function () {
            return this.nativeControl_.indeterminate;
        },
        set: function (indeterminate) {
            this.nativeControl_.indeterminate = indeterminate;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckbox.prototype, "disabled", {
        get: function () {
            return this.nativeControl_.disabled;
        },
        set: function (disabled) {
            this.foundation.setDisabled(disabled);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCCheckbox.prototype, "value", {
        get: function () {
            return this.nativeControl_.value;
        },
        set: function (value) {
            this.nativeControl_.value = value;
        },
        enumerable: true,
        configurable: true
    });
    MDCCheckbox.prototype.initialize = function () {
        var DATA_INDETERMINATE_ATTR = strings$q.DATA_INDETERMINATE_ATTR;
        this.nativeControl_.indeterminate =
            this.nativeControl_.getAttribute(DATA_INDETERMINATE_ATTR) === 'true';
        this.nativeControl_.removeAttribute(DATA_INDETERMINATE_ATTR);
    };
    MDCCheckbox.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleChange_ = function () { return _this.foundation.handleChange(); };
        this.handleAnimationEnd_ = function () { return _this.foundation.handleAnimationEnd(); };
        this.nativeControl_.addEventListener('change', this.handleChange_);
        this.listen(getCorrectEventName(window, 'animationend'), this.handleAnimationEnd_);
        this.installPropertyChangeHooks_();
    };
    MDCCheckbox.prototype.destroy = function () {
        this.ripple_.destroy();
        this.nativeControl_.removeEventListener('change', this.handleChange_);
        this.unlisten(getCorrectEventName(window, 'animationend'), this.handleAnimationEnd_);
        this.uninstallPropertyChangeHooks_();
        _super.prototype.destroy.call(this);
    };
    MDCCheckbox.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            forceLayout: function () { return _this.root.offsetWidth; },
            hasNativeControl: function () { return !!_this.nativeControl_; },
            isAttachedToDOM: function () { return Boolean(_this.root.parentNode); },
            isChecked: function () { return _this.checked; },
            isIndeterminate: function () { return _this.indeterminate; },
            removeClass: function (className) {
                _this.root.classList.remove(className);
            },
            removeNativeControlAttr: function (attr) {
                _this.nativeControl_.removeAttribute(attr);
            },
            setNativeControlAttr: function (attr, value) {
                _this.nativeControl_.setAttribute(attr, value);
            },
            setNativeControlDisabled: function (disabled) {
                _this.nativeControl_.disabled = disabled;
            },
        };
        return new MDCCheckboxFoundation(adapter);
    };
    MDCCheckbox.prototype.createRipple_ = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = __assign(__assign({}, MDCRipple.createAdapter(this)), { deregisterInteractionHandler: function (evtType, handler) { return _this.nativeControl_.removeEventListener(evtType, handler, applyPassive()); }, isSurfaceActive: function () { return matches(_this.nativeControl_, ':active'); }, isUnbounded: function () { return true; }, registerInteractionHandler: function (evtType, handler) { return _this.nativeControl_.addEventListener(evtType, handler, applyPassive()); } });
        return new MDCRipple(this.root, new MDCRippleFoundation(adapter));
    };
    MDCCheckbox.prototype.installPropertyChangeHooks_ = function () {
        var _this = this;
        var nativeCb = this.nativeControl_;
        var cbProto = Object.getPrototypeOf(nativeCb);
        CB_PROTO_PROPS.forEach(function (controlState) {
            var desc = Object.getOwnPropertyDescriptor(cbProto, controlState);
            // We have to check for this descriptor, since some browsers (Safari) don't support its return.
            // See: https://bugs.webkit.org/show_bug.cgi?id=49739
            if (!validDescriptor(desc)) {
                return;
            }
            // Type cast is needed for compatibility with Closure Compiler.
            var nativeGetter = desc.get;
            var nativeCbDesc = {
                configurable: desc.configurable,
                enumerable: desc.enumerable,
                get: nativeGetter,
                set: function (state) {
                    desc.set.call(nativeCb, state);
                    _this.foundation.handleChange();
                },
            };
            Object.defineProperty(nativeCb, controlState, nativeCbDesc);
        });
    };
    MDCCheckbox.prototype.uninstallPropertyChangeHooks_ = function () {
        var nativeCb = this.nativeControl_;
        var cbProto = Object.getPrototypeOf(nativeCb);
        CB_PROTO_PROPS.forEach(function (controlState) {
            var desc = Object.getOwnPropertyDescriptor(cbProto, controlState);
            if (!validDescriptor(desc)) {
                return;
            }
            Object.defineProperty(nativeCb, controlState, desc);
        });
    };
    Object.defineProperty(MDCCheckbox.prototype, "nativeControl_", {
        get: function () {
            var NATIVE_CONTROL_SELECTOR = strings$q.NATIVE_CONTROL_SELECTOR;
            var el = this.root.querySelector(NATIVE_CONTROL_SELECTOR);
            if (!el) {
                throw new Error("Checkbox component requires a " + NATIVE_CONTROL_SELECTOR + " element");
            }
            return el;
        },
        enumerable: true,
        configurable: true
    });
    return MDCCheckbox;
}(MDCComponent));
function validDescriptor(inputPropDesc) {
    return !!inputPropDesc && typeof inputPropDesc.set === 'function';
}

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var InteractionTrigger;
(function (InteractionTrigger) {
    InteractionTrigger[InteractionTrigger["UNSPECIFIED"] = 0] = "UNSPECIFIED";
    InteractionTrigger[InteractionTrigger["CLICK"] = 1] = "CLICK";
    InteractionTrigger[InteractionTrigger["BACKSPACE_KEY"] = 2] = "BACKSPACE_KEY";
    InteractionTrigger[InteractionTrigger["DELETE_KEY"] = 3] = "DELETE_KEY";
    InteractionTrigger[InteractionTrigger["SPACEBAR_KEY"] = 4] = "SPACEBAR_KEY";
    InteractionTrigger[InteractionTrigger["ENTER_KEY"] = 5] = "ENTER_KEY";
})(InteractionTrigger || (InteractionTrigger = {}));
var strings$p = {
    ARIA_HIDDEN: 'aria-hidden',
    INTERACTION_EVENT: 'MDCChipTrailingAction:interaction',
    NAVIGATION_EVENT: 'MDCChipTrailingAction:navigation',
    TAB_INDEX: 'tabindex',
};

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * KEY provides normalized string values for keys.
 */
var KEY = {
    UNKNOWN: 'Unknown',
    BACKSPACE: 'Backspace',
    ENTER: 'Enter',
    SPACEBAR: 'Spacebar',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    END: 'End',
    HOME: 'Home',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_UP: 'ArrowUp',
    ARROW_RIGHT: 'ArrowRight',
    ARROW_DOWN: 'ArrowDown',
    DELETE: 'Delete',
    ESCAPE: 'Escape',
};
var normalizedKeys = new Set();
// IE11 has no support for new Map with iterable so we need to initialize this
// by hand.
normalizedKeys.add(KEY.BACKSPACE);
normalizedKeys.add(KEY.ENTER);
normalizedKeys.add(KEY.SPACEBAR);
normalizedKeys.add(KEY.PAGE_UP);
normalizedKeys.add(KEY.PAGE_DOWN);
normalizedKeys.add(KEY.END);
normalizedKeys.add(KEY.HOME);
normalizedKeys.add(KEY.ARROW_LEFT);
normalizedKeys.add(KEY.ARROW_UP);
normalizedKeys.add(KEY.ARROW_RIGHT);
normalizedKeys.add(KEY.ARROW_DOWN);
normalizedKeys.add(KEY.DELETE);
normalizedKeys.add(KEY.ESCAPE);
var KEY_CODE = {
    BACKSPACE: 8,
    ENTER: 13,
    SPACEBAR: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    ARROW_LEFT: 37,
    ARROW_UP: 38,
    ARROW_RIGHT: 39,
    ARROW_DOWN: 40,
    DELETE: 46,
    ESCAPE: 27,
};
var mappedKeyCodes = new Map();
// IE11 has no support for new Map with iterable so we need to initialize this
// by hand.
mappedKeyCodes.set(KEY_CODE.BACKSPACE, KEY.BACKSPACE);
mappedKeyCodes.set(KEY_CODE.ENTER, KEY.ENTER);
mappedKeyCodes.set(KEY_CODE.SPACEBAR, KEY.SPACEBAR);
mappedKeyCodes.set(KEY_CODE.PAGE_UP, KEY.PAGE_UP);
mappedKeyCodes.set(KEY_CODE.PAGE_DOWN, KEY.PAGE_DOWN);
mappedKeyCodes.set(KEY_CODE.END, KEY.END);
mappedKeyCodes.set(KEY_CODE.HOME, KEY.HOME);
mappedKeyCodes.set(KEY_CODE.ARROW_LEFT, KEY.ARROW_LEFT);
mappedKeyCodes.set(KEY_CODE.ARROW_UP, KEY.ARROW_UP);
mappedKeyCodes.set(KEY_CODE.ARROW_RIGHT, KEY.ARROW_RIGHT);
mappedKeyCodes.set(KEY_CODE.ARROW_DOWN, KEY.ARROW_DOWN);
mappedKeyCodes.set(KEY_CODE.DELETE, KEY.DELETE);
mappedKeyCodes.set(KEY_CODE.ESCAPE, KEY.ESCAPE);
var navigationKeys$1 = new Set();
// IE11 has no support for new Set with iterable so we need to initialize this
// by hand.
navigationKeys$1.add(KEY.PAGE_UP);
navigationKeys$1.add(KEY.PAGE_DOWN);
navigationKeys$1.add(KEY.END);
navigationKeys$1.add(KEY.HOME);
navigationKeys$1.add(KEY.ARROW_LEFT);
navigationKeys$1.add(KEY.ARROW_UP);
navigationKeys$1.add(KEY.ARROW_RIGHT);
navigationKeys$1.add(KEY.ARROW_DOWN);
/**
 * normalizeKey returns the normalized string for a navigational action.
 */
function normalizeKey(evt) {
    var key = evt.key;
    // If the event already has a normalized key, return it
    if (normalizedKeys.has(key)) {
        return key;
    }
    // tslint:disable-next-line:deprecation
    var mappedKey = mappedKeyCodes.get(evt.keyCode);
    if (mappedKey) {
        return mappedKey;
    }
    return KEY.UNKNOWN;
}
/**
 * isNavigationEvent returns whether the event is a navigation event
 */
function isNavigationEvent(evt) {
    return navigationKeys$1.has(normalizeKey(evt));
}

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCChipTrailingActionFoundation = /** @class */ (function (_super) {
    __extends(MDCChipTrailingActionFoundation, _super);
    function MDCChipTrailingActionFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCChipTrailingActionFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCChipTrailingActionFoundation, "strings", {
        get: function () {
            return strings$p;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipTrailingActionFoundation, "defaultAdapter", {
        get: function () {
            return {
                focus: function () { return undefined; },
                getAttribute: function () { return null; },
                setAttribute: function () { return undefined; },
                notifyInteraction: function () { return undefined; },
                notifyNavigation: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCChipTrailingActionFoundation.prototype.handleClick = function (evt) {
        evt.stopPropagation();
        this.adapter.notifyInteraction(InteractionTrigger.CLICK);
    };
    MDCChipTrailingActionFoundation.prototype.handleKeydown = function (evt) {
        evt.stopPropagation();
        var key = normalizeKey(evt);
        if (this.shouldNotifyInteractionFromKey_(key)) {
            var trigger = this.getTriggerFromKey_(key);
            this.adapter.notifyInteraction(trigger);
            return;
        }
        if (isNavigationEvent(evt)) {
            this.adapter.notifyNavigation(key);
            return;
        }
    };
    MDCChipTrailingActionFoundation.prototype.removeFocus = function () {
        this.adapter.setAttribute(strings$p.TAB_INDEX, '-1');
    };
    MDCChipTrailingActionFoundation.prototype.focus = function () {
        this.adapter.setAttribute(strings$p.TAB_INDEX, '0');
        this.adapter.focus();
    };
    MDCChipTrailingActionFoundation.prototype.isNavigable = function () {
        return this.adapter.getAttribute(strings$p.ARIA_HIDDEN) !== 'true';
    };
    MDCChipTrailingActionFoundation.prototype.shouldNotifyInteractionFromKey_ = function (key) {
        var isFromActionKey = key === KEY.ENTER || key === KEY.SPACEBAR;
        var isFromDeleteKey = key === KEY.BACKSPACE || key === KEY.DELETE;
        return isFromActionKey || isFromDeleteKey;
    };
    MDCChipTrailingActionFoundation.prototype.getTriggerFromKey_ = function (key) {
        if (key === KEY.SPACEBAR) {
            return InteractionTrigger.SPACEBAR_KEY;
        }
        if (key === KEY.ENTER) {
            return InteractionTrigger.ENTER_KEY;
        }
        if (key === KEY.DELETE) {
            return InteractionTrigger.DELETE_KEY;
        }
        if (key === KEY.BACKSPACE) {
            return InteractionTrigger.BACKSPACE_KEY;
        }
        // Default case, should never be returned
        return InteractionTrigger.UNSPECIFIED;
    };
    return MDCChipTrailingActionFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCChipTrailingAction = /** @class */ (function (_super) {
    __extends(MDCChipTrailingAction, _super);
    function MDCChipTrailingAction() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(MDCChipTrailingAction.prototype, "ripple", {
        get: function () {
            return this.ripple_;
        },
        enumerable: true,
        configurable: true
    });
    MDCChipTrailingAction.attachTo = function (root) {
        return new MDCChipTrailingAction(root);
    };
    MDCChipTrailingAction.prototype.initialize = function (rippleFactory) {
        if (rippleFactory === void 0) { rippleFactory = function (el, foundation) {
            return new MDCRipple(el, foundation);
        }; }
        // DO NOT INLINE this variable. For backward compatibility, foundations take
        // a Partial<MDCFooAdapter>. To ensure we don't accidentally omit any
        // methods, we need a separate, strongly typed adapter variable.
        var rippleAdapter = MDCRipple.createAdapter(this);
        this.ripple_ =
            rippleFactory(this.root, new MDCRippleFoundation(rippleAdapter));
    };
    MDCChipTrailingAction.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleClick_ = function (evt) {
            _this.foundation.handleClick(evt);
        };
        this.handleKeydown_ = function (evt) {
            _this.foundation.handleKeydown(evt);
        };
        this.listen('click', this.handleClick_);
        this.listen('keydown', this.handleKeydown_);
    };
    MDCChipTrailingAction.prototype.destroy = function () {
        this.ripple_.destroy();
        this.unlisten('click', this.handleClick_);
        this.unlisten('keydown', this.handleKeydown_);
        _super.prototype.destroy.call(this);
    };
    MDCChipTrailingAction.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take
        // a Partial<MDCFooAdapter>. To ensure we don't accidentally omit any
        // methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            focus: function () {
                // TODO(b/157231863): Migate MDCComponent#root to HTMLElement
                _this.root.focus();
            },
            getAttribute: function (attr) { return _this.root.getAttribute(attr); },
            notifyInteraction: function (trigger) {
                return _this.emit(strings$p.INTERACTION_EVENT, { trigger: trigger }, true /* shouldBubble */);
            },
            notifyNavigation: function (key) {
                _this.emit(strings$p.NAVIGATION_EVENT, { key: key }, true /* shouldBubble */);
            },
            setAttribute: function (attr, value) {
                _this.root.setAttribute(attr, value);
            },
        };
        return new MDCChipTrailingActionFoundation(adapter);
    };
    MDCChipTrailingAction.prototype.isNavigable = function () {
        return this.foundation.isNavigable();
    };
    MDCChipTrailingAction.prototype.focus = function () {
        this.foundation.focus();
    };
    MDCChipTrailingAction.prototype.removeFocus = function () {
        this.foundation.removeFocus();
    };
    return MDCChipTrailingAction;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var Direction;
(function (Direction) {
    Direction["LEFT"] = "left";
    Direction["RIGHT"] = "right";
})(Direction || (Direction = {}));
var EventSource;
(function (EventSource) {
    EventSource["PRIMARY"] = "primary";
    EventSource["TRAILING"] = "trailing";
    EventSource["NONE"] = "none";
})(EventSource || (EventSource = {}));
var strings$o = {
    ADDED_ANNOUNCEMENT_ATTRIBUTE: 'data-mdc-chip-added-announcement',
    ARIA_CHECKED: 'aria-checked',
    ARROW_DOWN_KEY: 'ArrowDown',
    ARROW_LEFT_KEY: 'ArrowLeft',
    ARROW_RIGHT_KEY: 'ArrowRight',
    ARROW_UP_KEY: 'ArrowUp',
    BACKSPACE_KEY: 'Backspace',
    CHECKMARK_SELECTOR: '.mdc-chip__checkmark',
    DELETE_KEY: 'Delete',
    END_KEY: 'End',
    ENTER_KEY: 'Enter',
    ENTRY_ANIMATION_NAME: 'mdc-chip-entry',
    HOME_KEY: 'Home',
    IE_ARROW_DOWN_KEY: 'Down',
    IE_ARROW_LEFT_KEY: 'Left',
    IE_ARROW_RIGHT_KEY: 'Right',
    IE_ARROW_UP_KEY: 'Up',
    IE_DELETE_KEY: 'Del',
    INTERACTION_EVENT: 'MDCChip:interaction',
    LEADING_ICON_SELECTOR: '.mdc-chip__icon--leading',
    NAVIGATION_EVENT: 'MDCChip:navigation',
    PRIMARY_ACTION_SELECTOR: '.mdc-chip__primary-action',
    REMOVED_ANNOUNCEMENT_ATTRIBUTE: 'data-mdc-chip-removed-announcement',
    REMOVAL_EVENT: 'MDCChip:removal',
    SELECTION_EVENT: 'MDCChip:selection',
    SPACEBAR_KEY: ' ',
    TAB_INDEX: 'tabindex',
    TRAILING_ACTION_SELECTOR: '.mdc-chip-trailing-action',
    TRAILING_ICON_INTERACTION_EVENT: 'MDCChip:trailingIconInteraction',
    TRAILING_ICON_SELECTOR: '.mdc-chip__icon--trailing',
};
var cssClasses$m = {
    CHECKMARK: 'mdc-chip__checkmark',
    CHIP_EXIT: 'mdc-chip--exit',
    DELETABLE: 'mdc-chip--deletable',
    EDITABLE: 'mdc-chip--editable',
    EDITING: 'mdc-chip--editing',
    HIDDEN_LEADING_ICON: 'mdc-chip__icon--leading-hidden',
    LEADING_ICON: 'mdc-chip__icon--leading',
    PRIMARY_ACTION: 'mdc-chip__primary-action',
    PRIMARY_ACTION_FOCUSED: 'mdc-chip--primary-action-focused',
    SELECTED: 'mdc-chip--selected',
    TEXT: 'mdc-chip__text',
    TRAILING_ACTION: 'mdc-chip__trailing-action',
    TRAILING_ICON: 'mdc-chip__icon--trailing',
};
var navigationKeys = new Set();
// IE11 has no support for new Set with iterable so we need to initialize this by hand
navigationKeys.add(strings$o.ARROW_LEFT_KEY);
navigationKeys.add(strings$o.ARROW_RIGHT_KEY);
navigationKeys.add(strings$o.ARROW_DOWN_KEY);
navigationKeys.add(strings$o.ARROW_UP_KEY);
navigationKeys.add(strings$o.END_KEY);
navigationKeys.add(strings$o.HOME_KEY);
navigationKeys.add(strings$o.IE_ARROW_LEFT_KEY);
navigationKeys.add(strings$o.IE_ARROW_RIGHT_KEY);
navigationKeys.add(strings$o.IE_ARROW_DOWN_KEY);
navigationKeys.add(strings$o.IE_ARROW_UP_KEY);
var jumpChipKeys = new Set();
// IE11 has no support for new Set with iterable so we need to initialize this by hand
jumpChipKeys.add(strings$o.ARROW_UP_KEY);
jumpChipKeys.add(strings$o.ARROW_DOWN_KEY);
jumpChipKeys.add(strings$o.HOME_KEY);
jumpChipKeys.add(strings$o.END_KEY);
jumpChipKeys.add(strings$o.IE_ARROW_UP_KEY);
jumpChipKeys.add(strings$o.IE_ARROW_DOWN_KEY);

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var emptyClientRect = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
};
var FocusBehavior;
(function (FocusBehavior) {
    FocusBehavior[FocusBehavior["SHOULD_FOCUS"] = 0] = "SHOULD_FOCUS";
    FocusBehavior[FocusBehavior["SHOULD_NOT_FOCUS"] = 1] = "SHOULD_NOT_FOCUS";
})(FocusBehavior || (FocusBehavior = {}));
var MDCChipFoundation = /** @class */ (function (_super) {
    __extends(MDCChipFoundation, _super);
    function MDCChipFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCChipFoundation.defaultAdapter), adapter)) || this;
        /** Whether a trailing icon click should immediately trigger exit/removal of the chip. */
        _this.shouldRemoveOnTrailingIconClick_ = true;
        /**
         * Whether the primary action should receive focus on click. Should only be
         * set to true for clients who programmatically give focus to a different
         * element on the page when a chip is clicked (like a menu).
         */
        _this.shouldFocusPrimaryActionOnClick_ = true;
        return _this;
    }
    Object.defineProperty(MDCChipFoundation, "strings", {
        get: function () {
            return strings$o;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipFoundation, "cssClasses", {
        get: function () {
            return cssClasses$m;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                addClassToLeadingIcon: function () { return undefined; },
                eventTargetHasClass: function () { return false; },
                focusPrimaryAction: function () { return undefined; },
                focusTrailingAction: function () { return undefined; },
                getAttribute: function () { return null; },
                getCheckmarkBoundingClientRect: function () { return emptyClientRect; },
                getComputedStyleValue: function () { return ''; },
                getRootBoundingClientRect: function () { return emptyClientRect; },
                hasClass: function () { return false; },
                hasLeadingIcon: function () { return false; },
                isRTL: function () { return false; },
                isTrailingActionNavigable: function () { return false; },
                notifyEditFinish: function () { return undefined; },
                notifyEditStart: function () { return undefined; },
                notifyInteraction: function () { return undefined; },
                notifyNavigation: function () { return undefined; },
                notifyRemoval: function () { return undefined; },
                notifySelection: function () { return undefined; },
                notifyTrailingIconInteraction: function () { return undefined; },
                removeClass: function () { return undefined; },
                removeClassFromLeadingIcon: function () { return undefined; },
                removeTrailingActionFocus: function () { return undefined; },
                setPrimaryActionAttr: function () { return undefined; },
                setStyleProperty: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCChipFoundation.prototype.isSelected = function () {
        return this.adapter.hasClass(cssClasses$m.SELECTED);
    };
    MDCChipFoundation.prototype.isEditable = function () {
        return this.adapter.hasClass(cssClasses$m.EDITABLE);
    };
    MDCChipFoundation.prototype.isEditing = function () {
        return this.adapter.hasClass(cssClasses$m.EDITING);
    };
    MDCChipFoundation.prototype.setSelected = function (selected) {
        this.setSelected_(selected);
        this.notifySelection_(selected);
    };
    MDCChipFoundation.prototype.setSelectedFromChipSet = function (selected, shouldNotifyClients) {
        this.setSelected_(selected);
        if (shouldNotifyClients) {
            this.notifyIgnoredSelection_(selected);
        }
    };
    MDCChipFoundation.prototype.getShouldRemoveOnTrailingIconClick = function () {
        return this.shouldRemoveOnTrailingIconClick_;
    };
    MDCChipFoundation.prototype.setShouldRemoveOnTrailingIconClick = function (shouldRemove) {
        this.shouldRemoveOnTrailingIconClick_ = shouldRemove;
    };
    MDCChipFoundation.prototype.setShouldFocusPrimaryActionOnClick = function (shouldFocus) {
        this.shouldFocusPrimaryActionOnClick_ = shouldFocus;
    };
    MDCChipFoundation.prototype.getDimensions = function () {
        var _this = this;
        var getRootRect = function () { return _this.adapter.getRootBoundingClientRect(); };
        var getCheckmarkRect = function () {
            return _this.adapter.getCheckmarkBoundingClientRect();
        };
        // When a chip has a checkmark and not a leading icon, the bounding rect changes in size depending on the current
        // size of the checkmark.
        if (!this.adapter.hasLeadingIcon()) {
            var checkmarkRect = getCheckmarkRect();
            if (checkmarkRect) {
                var rootRect = getRootRect();
                // Checkmark is a square, meaning the client rect's width and height are identical once the animation completes.
                // However, the checkbox is initially hidden by setting the width to 0.
                // To account for an initial width of 0, we use the checkbox's height instead (which equals the end-state width)
                // when adding it to the root client rect's width.
                return {
                    bottom: rootRect.bottom,
                    height: rootRect.height,
                    left: rootRect.left,
                    right: rootRect.right,
                    top: rootRect.top,
                    width: rootRect.width + checkmarkRect.height,
                };
            }
        }
        return getRootRect();
    };
    /**
     * Begins the exit animation which leads to removal of the chip.
     */
    MDCChipFoundation.prototype.beginExit = function () {
        this.adapter.addClass(cssClasses$m.CHIP_EXIT);
    };
    MDCChipFoundation.prototype.handleClick = function () {
        this.adapter.notifyInteraction();
        this.setPrimaryActionFocusable_(this.getFocusBehavior_());
    };
    MDCChipFoundation.prototype.handleDoubleClick = function () {
        if (this.isEditable()) {
            this.startEditing();
        }
    };
    /**
     * Handles a transition end event on the root element.
     */
    MDCChipFoundation.prototype.handleTransitionEnd = function (evt) {
        var _this = this;
        // Handle transition end event on the chip when it is about to be removed.
        var shouldHandle = this.adapter.eventTargetHasClass(evt.target, cssClasses$m.CHIP_EXIT);
        var widthIsAnimating = evt.propertyName === 'width';
        var opacityIsAnimating = evt.propertyName === 'opacity';
        if (shouldHandle && opacityIsAnimating) {
            // See: https://css-tricks.com/using-css-transitions-auto-dimensions/#article-header-id-5
            var chipWidth_1 = this.adapter.getComputedStyleValue('width');
            // On the next frame (once we get the computed width), explicitly set the chip's width
            // to its current pixel width, so we aren't transitioning out of 'auto'.
            requestAnimationFrame(function () {
                _this.adapter.setStyleProperty('width', chipWidth_1);
                // To mitigate jitter, start transitioning padding and margin before width.
                _this.adapter.setStyleProperty('padding', '0');
                _this.adapter.setStyleProperty('margin', '0');
                // On the next frame (once width is explicitly set), transition width to 0.
                requestAnimationFrame(function () {
                    _this.adapter.setStyleProperty('width', '0');
                });
            });
            return;
        }
        if (shouldHandle && widthIsAnimating) {
            this.removeFocus();
            var removedAnnouncement = this.adapter.getAttribute(strings$o.REMOVED_ANNOUNCEMENT_ATTRIBUTE);
            this.adapter.notifyRemoval(removedAnnouncement);
        }
        // Handle a transition end event on the leading icon or checkmark, since the transition end event bubbles.
        if (!opacityIsAnimating) {
            return;
        }
        var shouldHideLeadingIcon = this.adapter.eventTargetHasClass(evt.target, cssClasses$m.LEADING_ICON) &&
            this.adapter.hasClass(cssClasses$m.SELECTED);
        var shouldShowLeadingIcon = this.adapter.eventTargetHasClass(evt.target, cssClasses$m.CHECKMARK) &&
            !this.adapter.hasClass(cssClasses$m.SELECTED);
        if (shouldHideLeadingIcon) {
            this.adapter.addClassToLeadingIcon(cssClasses$m.HIDDEN_LEADING_ICON);
            return;
        }
        if (shouldShowLeadingIcon) {
            this.adapter.removeClassFromLeadingIcon(cssClasses$m.HIDDEN_LEADING_ICON);
            return;
        }
    };
    MDCChipFoundation.prototype.handleFocusIn = function (evt) {
        // Early exit if the event doesn't come from the primary action
        if (!this.eventFromPrimaryAction_(evt)) {
            return;
        }
        this.adapter.addClass(cssClasses$m.PRIMARY_ACTION_FOCUSED);
    };
    MDCChipFoundation.prototype.handleFocusOut = function (evt) {
        // Early exit if the event doesn't come from the primary action
        if (!this.eventFromPrimaryAction_(evt)) {
            return;
        }
        if (this.isEditing()) {
            this.finishEditing();
        }
        this.adapter.removeClass(cssClasses$m.PRIMARY_ACTION_FOCUSED);
    };
    /**
     * Handles an interaction event on the trailing icon element. This is used to
     * prevent the ripple from activating on interaction with the trailing icon.
     */
    MDCChipFoundation.prototype.handleTrailingActionInteraction = function () {
        this.adapter.notifyTrailingIconInteraction();
        this.removeChip_();
    };
    /**
     * Handles a keydown event from the root element.
     */
    MDCChipFoundation.prototype.handleKeydown = function (evt) {
        if (this.isEditing()) {
            if (this.shouldFinishEditing(evt)) {
                evt.preventDefault();
                this.finishEditing();
            }
            // When editing, the foundation should only handle key events that finish
            // the editing process.
            return;
        }
        if (this.isEditable()) {
            if (this.shouldStartEditing(evt)) {
                evt.preventDefault();
                this.startEditing();
            }
        }
        if (this.shouldNotifyInteraction_(evt)) {
            this.adapter.notifyInteraction();
            this.setPrimaryActionFocusable_(this.getFocusBehavior_());
            return;
        }
        if (this.isDeleteAction_(evt)) {
            evt.preventDefault();
            this.removeChip_();
            return;
        }
        // Early exit if the key is not usable
        if (!navigationKeys.has(evt.key)) {
            return;
        }
        // Prevent default behavior for movement keys which could include scrolling
        evt.preventDefault();
        this.focusNextAction_(evt.key, EventSource.PRIMARY);
    };
    MDCChipFoundation.prototype.handleTrailingActionNavigation = function (evt) {
        return this.focusNextAction_(evt.detail.key, EventSource.TRAILING);
    };
    /**
     * Called by the chip set to remove focus from the chip actions.
     */
    MDCChipFoundation.prototype.removeFocus = function () {
        this.adapter.setPrimaryActionAttr(strings$o.TAB_INDEX, '-1');
        this.adapter.removeTrailingActionFocus();
    };
    /**
     * Called by the chip set to focus the primary action.
     *
     */
    MDCChipFoundation.prototype.focusPrimaryAction = function () {
        this.setPrimaryActionFocusable_(FocusBehavior.SHOULD_FOCUS);
    };
    /**
     * Called by the chip set to focus the trailing action (if present), otherwise
     * gives focus to the trailing action.
     */
    MDCChipFoundation.prototype.focusTrailingAction = function () {
        var trailingActionIsNavigable = this.adapter.isTrailingActionNavigable();
        if (trailingActionIsNavigable) {
            this.adapter.setPrimaryActionAttr(strings$o.TAB_INDEX, '-1');
            this.adapter.focusTrailingAction();
            return;
        }
        this.focusPrimaryAction();
    };
    MDCChipFoundation.prototype.setPrimaryActionFocusable_ = function (focusBehavior) {
        this.adapter.setPrimaryActionAttr(strings$o.TAB_INDEX, '0');
        if (focusBehavior === FocusBehavior.SHOULD_FOCUS) {
            this.adapter.focusPrimaryAction();
        }
        this.adapter.removeTrailingActionFocus();
    };
    MDCChipFoundation.prototype.getFocusBehavior_ = function () {
        if (this.shouldFocusPrimaryActionOnClick_) {
            return FocusBehavior.SHOULD_FOCUS;
        }
        return FocusBehavior.SHOULD_NOT_FOCUS;
    };
    MDCChipFoundation.prototype.focusNextAction_ = function (key, source) {
        var isTrailingActionNavigable = this.adapter.isTrailingActionNavigable();
        var dir = this.getDirection_(key);
        // Early exit if the key should jump chips
        if (jumpChipKeys.has(key) || !isTrailingActionNavigable) {
            return this.adapter.notifyNavigation(key, source);
        }
        if (source === EventSource.PRIMARY && dir === Direction.RIGHT) {
            return this.focusTrailingAction();
        }
        if (source === EventSource.TRAILING && dir === Direction.LEFT) {
            return this.focusPrimaryAction();
        }
        this.adapter.notifyNavigation(key, EventSource.NONE);
    };
    MDCChipFoundation.prototype.getDirection_ = function (key) {
        var isRTL = this.adapter.isRTL();
        var isLeftKey = key === strings$o.ARROW_LEFT_KEY || key === strings$o.IE_ARROW_LEFT_KEY;
        var isRightKey = key === strings$o.ARROW_RIGHT_KEY || key === strings$o.IE_ARROW_RIGHT_KEY;
        if (!isRTL && isLeftKey || isRTL && isRightKey) {
            return Direction.LEFT;
        }
        return Direction.RIGHT;
    };
    MDCChipFoundation.prototype.removeChip_ = function () {
        if (this.shouldRemoveOnTrailingIconClick_) {
            this.beginExit();
        }
    };
    MDCChipFoundation.prototype.shouldStartEditing = function (evt) {
        return this.eventFromPrimaryAction_(evt) && evt.key === strings$o.ENTER_KEY;
    };
    MDCChipFoundation.prototype.shouldFinishEditing = function (evt) {
        return evt.key === strings$o.ENTER_KEY;
    };
    MDCChipFoundation.prototype.shouldNotifyInteraction_ = function (evt) {
        return evt.key === strings$o.ENTER_KEY || evt.key === strings$o.SPACEBAR_KEY;
    };
    MDCChipFoundation.prototype.isDeleteAction_ = function (evt) {
        var isDeletable = this.adapter.hasClass(cssClasses$m.DELETABLE);
        return isDeletable &&
            (evt.key === strings$o.BACKSPACE_KEY || evt.key === strings$o.DELETE_KEY ||
                evt.key === strings$o.IE_DELETE_KEY);
    };
    MDCChipFoundation.prototype.setSelected_ = function (selected) {
        if (selected) {
            this.adapter.addClass(cssClasses$m.SELECTED);
            this.adapter.setPrimaryActionAttr(strings$o.ARIA_CHECKED, 'true');
        }
        else {
            this.adapter.removeClass(cssClasses$m.SELECTED);
            this.adapter.setPrimaryActionAttr(strings$o.ARIA_CHECKED, 'false');
        }
    };
    MDCChipFoundation.prototype.notifySelection_ = function (selected) {
        this.adapter.notifySelection(selected, false);
    };
    MDCChipFoundation.prototype.notifyIgnoredSelection_ = function (selected) {
        this.adapter.notifySelection(selected, true);
    };
    MDCChipFoundation.prototype.eventFromPrimaryAction_ = function (evt) {
        return this.adapter.eventTargetHasClass(evt.target, cssClasses$m.PRIMARY_ACTION);
    };
    MDCChipFoundation.prototype.startEditing = function () {
        this.adapter.addClass(cssClasses$m.EDITING);
        this.adapter.notifyEditStart();
    };
    MDCChipFoundation.prototype.finishEditing = function () {
        this.adapter.removeClass(cssClasses$m.EDITING);
        this.adapter.notifyEditFinish();
    };
    return MDCChipFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCChip = /** @class */ (function (_super) {
    __extends(MDCChip, _super);
    function MDCChip() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(MDCChip.prototype, "selected", {
        /**
         * @return Whether the chip is selected.
         */
        get: function () {
            return this.foundation.isSelected();
        },
        /**
         * Sets selected state on the chip.
         */
        set: function (selected) {
            this.foundation.setSelected(selected);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChip.prototype, "shouldRemoveOnTrailingIconClick", {
        /**
         * @return Whether a trailing icon click should trigger exit/removal of the chip.
         */
        get: function () {
            return this.foundation.getShouldRemoveOnTrailingIconClick();
        },
        /**
         * Sets whether a trailing icon click should trigger exit/removal of the chip.
         */
        set: function (shouldRemove) {
            this.foundation.setShouldRemoveOnTrailingIconClick(shouldRemove);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChip.prototype, "setShouldFocusPrimaryActionOnClick", {
        /**
         * Sets whether a clicking on the chip should focus the primary action.
         */
        set: function (shouldFocus) {
            this.foundation.setShouldFocusPrimaryActionOnClick(shouldFocus);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChip.prototype, "ripple", {
        get: function () {
            return this.ripple_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChip.prototype, "id", {
        get: function () {
            return this.root.id;
        },
        enumerable: true,
        configurable: true
    });
    MDCChip.attachTo = function (root) {
        return new MDCChip(root);
    };
    MDCChip.prototype.initialize = function (rippleFactory, trailingActionFactory) {
        var _this = this;
        if (rippleFactory === void 0) { rippleFactory = function (el, foundation) { return new MDCRipple(el, foundation); }; }
        if (trailingActionFactory === void 0) { trailingActionFactory = function (el) { return new MDCChipTrailingAction(el); }; }
        this.leadingIcon_ = this.root.querySelector(strings$o.LEADING_ICON_SELECTOR);
        this.checkmark_ = this.root.querySelector(strings$o.CHECKMARK_SELECTOR);
        this.primaryAction_ =
            this.root.querySelector(strings$o.PRIMARY_ACTION_SELECTOR);
        var trailingActionEl = this.root.querySelector(strings$o.TRAILING_ACTION_SELECTOR);
        if (trailingActionEl) {
            this.trailingAction_ = trailingActionFactory(trailingActionEl);
        }
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var rippleAdapter = __assign(__assign({}, MDCRipple.createAdapter(this)), { computeBoundingRect: function () { return _this.foundation.getDimensions(); } });
        this.ripple_ =
            rippleFactory(this.root, new MDCRippleFoundation(rippleAdapter));
    };
    MDCChip.prototype.initialSyncWithDOM = function () {
        var _this = this;
        // Custom events
        this.handleTrailingActionInteraction_ = function () {
            _this.foundation.handleTrailingActionInteraction();
        };
        this.handleTrailingActionNavigation_ =
            function (evt) {
                _this.foundation.handleTrailingActionNavigation(evt);
            };
        // Native events
        this.handleClick_ = function () {
            _this.foundation.handleClick();
        };
        this.handleKeydown_ = function (evt) {
            _this.foundation.handleKeydown(evt);
        };
        this.handleTransitionEnd_ = function (evt) {
            _this.foundation.handleTransitionEnd(evt);
        };
        this.handleFocusIn_ = function (evt) {
            _this.foundation.handleFocusIn(evt);
        };
        this.handleFocusOut_ = function (evt) {
            _this.foundation.handleFocusOut(evt);
        };
        this.listen('transitionend', this.handleTransitionEnd_);
        this.listen('click', this.handleClick_);
        this.listen('keydown', this.handleKeydown_);
        this.listen('focusin', this.handleFocusIn_);
        this.listen('focusout', this.handleFocusOut_);
        if (this.trailingAction_) {
            this.listen(strings$p.INTERACTION_EVENT, this.handleTrailingActionInteraction_);
            this.listen(strings$p.NAVIGATION_EVENT, this.handleTrailingActionNavigation_);
        }
    };
    MDCChip.prototype.destroy = function () {
        this.ripple_.destroy();
        this.unlisten('transitionend', this.handleTransitionEnd_);
        this.unlisten('keydown', this.handleKeydown_);
        this.unlisten('click', this.handleClick_);
        this.unlisten('focusin', this.handleFocusIn_);
        this.unlisten('focusout', this.handleFocusOut_);
        if (this.trailingAction_) {
            this.unlisten(strings$p.INTERACTION_EVENT, this.handleTrailingActionInteraction_);
            this.unlisten(strings$p.NAVIGATION_EVENT, this.handleTrailingActionNavigation_);
        }
        _super.prototype.destroy.call(this);
    };
    /**
     * Begins the exit animation which leads to removal of the chip.
     */
    MDCChip.prototype.beginExit = function () {
        this.foundation.beginExit();
    };
    MDCChip.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            addClassToLeadingIcon: function (className) {
                if (_this.leadingIcon_) {
                    _this.leadingIcon_.classList.add(className);
                }
            },
            eventTargetHasClass: function (target, className) {
                return target ? target.classList.contains(className) : false;
            },
            focusPrimaryAction: function () {
                if (_this.primaryAction_) {
                    _this.primaryAction_.focus();
                }
            },
            focusTrailingAction: function () {
                if (_this.trailingAction_) {
                    _this.trailingAction_.focus();
                }
            },
            getAttribute: function (attr) { return _this.root.getAttribute(attr); },
            getCheckmarkBoundingClientRect: function () {
                return _this.checkmark_ ? _this.checkmark_.getBoundingClientRect() : null;
            },
            getComputedStyleValue: function (propertyName) {
                return window.getComputedStyle(_this.root).getPropertyValue(propertyName);
            },
            getRootBoundingClientRect: function () { return _this.root.getBoundingClientRect(); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            hasLeadingIcon: function () { return !!_this.leadingIcon_; },
            isRTL: function () { return window.getComputedStyle(_this.root).getPropertyValue('direction') === 'rtl'; },
            isTrailingActionNavigable: function () {
                if (_this.trailingAction_) {
                    return _this.trailingAction_.isNavigable();
                }
                return false;
            },
            notifyInteraction: function () { return _this.emit(strings$o.INTERACTION_EVENT, { chipId: _this.id }, true /* shouldBubble */); },
            notifyNavigation: function (key, source) {
                return _this.emit(strings$o.NAVIGATION_EVENT, { chipId: _this.id, key: key, source: source }, true /* shouldBubble */);
            },
            notifyRemoval: function (removedAnnouncement) {
                _this.emit(strings$o.REMOVAL_EVENT, { chipId: _this.id, removedAnnouncement: removedAnnouncement }, true /* shouldBubble */);
            },
            notifySelection: function (selected, shouldIgnore) {
                return _this.emit(strings$o.SELECTION_EVENT, { chipId: _this.id, selected: selected, shouldIgnore: shouldIgnore }, true /* shouldBubble */);
            },
            notifyTrailingIconInteraction: function () {
                return _this.emit(strings$o.TRAILING_ICON_INTERACTION_EVENT, { chipId: _this.id }, true /* shouldBubble */);
            },
            notifyEditStart: function () { },
            notifyEditFinish: function () { },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            removeClassFromLeadingIcon: function (className) {
                if (_this.leadingIcon_) {
                    _this.leadingIcon_.classList.remove(className);
                }
            },
            removeTrailingActionFocus: function () {
                if (_this.trailingAction_) {
                    _this.trailingAction_.removeFocus();
                }
            },
            setPrimaryActionAttr: function (attr, value) {
                if (_this.primaryAction_) {
                    _this.primaryAction_.setAttribute(attr, value);
                }
            },
            setStyleProperty: function (propertyName, value) {
                return _this.root.style.setProperty(propertyName, value);
            },
        };
        return new MDCChipFoundation(adapter);
    };
    MDCChip.prototype.setSelectedFromChipSet = function (selected, shouldNotifyClients) {
        this.foundation.setSelectedFromChipSet(selected, shouldNotifyClients);
    };
    MDCChip.prototype.focusPrimaryAction = function () {
        this.foundation.focusPrimaryAction();
    };
    MDCChip.prototype.focusTrailingAction = function () {
        this.foundation.focusTrailingAction();
    };
    MDCChip.prototype.removeFocus = function () {
        this.foundation.removeFocus();
    };
    MDCChip.prototype.remove = function () {
        var parent = this.root.parentNode;
        if (parent !== null) {
            parent.removeChild(this.root);
        }
    };
    return MDCChip;
}(MDCComponent));

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Priorities for the announce function
 */
var AnnouncerPriority;
(function (AnnouncerPriority) {
    AnnouncerPriority["POLITE"] = "polite";
    AnnouncerPriority["ASSERTIVE"] = "assertive";
})(AnnouncerPriority || (AnnouncerPriority = {}));
/**
 * Announces the given message with optional priority, defaulting to "polite"
 */
function announce(message, priority) {
    Announcer.getInstance().say(message, priority);
}
var Announcer = /** @class */ (function () {
    // Constructor made private to ensure only the singleton is used
    function Announcer() {
        this.liveRegions = new Map();
    }
    Announcer.getInstance = function () {
        if (!Announcer.instance) {
            Announcer.instance = new Announcer();
        }
        return Announcer.instance;
    };
    Announcer.prototype.say = function (message, priority) {
        if (priority === void 0) { priority = AnnouncerPriority.POLITE; }
        var liveRegion = this.getLiveRegion(priority);
        // Reset the region to pick up the message, even if the message is the
        // exact same as before.
        liveRegion.textContent = '';
        // Timeout is necessary for screen readers like NVDA and VoiceOver.
        setTimeout(function () {
            liveRegion.textContent = message;
            document.addEventListener('click', clearLiveRegion);
        }, 1);
        function clearLiveRegion() {
            liveRegion.textContent = '';
            document.removeEventListener('click', clearLiveRegion);
        }
    };
    Announcer.prototype.getLiveRegion = function (priority) {
        var existingLiveRegion = this.liveRegions.get(priority);
        if (existingLiveRegion &&
            document.body.contains(existingLiveRegion)) {
            return existingLiveRegion;
        }
        var liveRegion = this.createLiveRegion(priority);
        this.liveRegions.set(priority, liveRegion);
        return liveRegion;
    };
    Announcer.prototype.createLiveRegion = function (priority) {
        var el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = '-9999px';
        el.style.left = '-9999px';
        el.style.height = '1px';
        el.style.overflow = 'hidden';
        el.setAttribute('aria-atomic', 'true');
        el.setAttribute('aria-live', priority);
        document.body.appendChild(el);
        return el;
    };
    return Announcer;
}());

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$n = {
    CHIP_SELECTOR: '.mdc-chip',
};
var cssClasses$l = {
    CHOICE: 'mdc-chip-set--choice',
    FILTER: 'mdc-chip-set--filter',
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCChipSetFoundation = /** @class */ (function (_super) {
    __extends(MDCChipSetFoundation, _super);
    function MDCChipSetFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCChipSetFoundation.defaultAdapter), adapter)) || this;
        /**
         * The ids of the selected chips in the set. Only used for choice chip set or filter chip set.
         */
        _this.selectedChipIds_ = [];
        return _this;
    }
    Object.defineProperty(MDCChipSetFoundation, "strings", {
        get: function () {
            return strings$n;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipSetFoundation, "cssClasses", {
        get: function () {
            return cssClasses$l;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipSetFoundation, "defaultAdapter", {
        get: function () {
            return {
                announceMessage: function () { return undefined; },
                focusChipPrimaryActionAtIndex: function () { return undefined; },
                focusChipTrailingActionAtIndex: function () { return undefined; },
                getChipListCount: function () { return -1; },
                getIndexOfChipById: function () { return -1; },
                hasClass: function () { return false; },
                isRTL: function () { return false; },
                removeChipAtIndex: function () { return undefined; },
                removeFocusFromChipAtIndex: function () { return undefined; },
                selectChipAtIndex: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Returns an array of the IDs of all selected chips.
     */
    MDCChipSetFoundation.prototype.getSelectedChipIds = function () {
        return this.selectedChipIds_.slice();
    };
    /**
     * Selects the chip with the given id. Deselects all other chips if the chip set is of the choice variant.
     * Does not notify clients of the updated selection state.
     */
    MDCChipSetFoundation.prototype.select = function (chipId) {
        this.select_(chipId, false);
    };
    /**
     * Handles a chip interaction event
     */
    MDCChipSetFoundation.prototype.handleChipInteraction = function (_a) {
        var chipId = _a.chipId;
        var index = this.adapter.getIndexOfChipById(chipId);
        this.removeFocusFromChipsExcept_(index);
        if (this.adapter.hasClass(cssClasses$l.CHOICE) ||
            this.adapter.hasClass(cssClasses$l.FILTER)) {
            this.toggleSelect_(chipId);
        }
    };
    /**
     * Handles a chip selection event, used to handle discrepancy when selection state is set directly on the Chip.
     */
    MDCChipSetFoundation.prototype.handleChipSelection = function (_a) {
        var chipId = _a.chipId, selected = _a.selected, shouldIgnore = _a.shouldIgnore;
        // Early exit if we should ignore the event
        if (shouldIgnore) {
            return;
        }
        var chipIsSelected = this.selectedChipIds_.indexOf(chipId) >= 0;
        if (selected && !chipIsSelected) {
            this.select(chipId);
        }
        else if (!selected && chipIsSelected) {
            this.deselect_(chipId);
        }
    };
    /**
     * Handles the event when a chip is removed.
     */
    MDCChipSetFoundation.prototype.handleChipRemoval = function (_a) {
        var chipId = _a.chipId, removedAnnouncement = _a.removedAnnouncement;
        if (removedAnnouncement) {
            this.adapter.announceMessage(removedAnnouncement);
        }
        var index = this.adapter.getIndexOfChipById(chipId);
        this.deselectAndNotifyClients_(chipId);
        this.adapter.removeChipAtIndex(index);
        var maxIndex = this.adapter.getChipListCount() - 1;
        var nextIndex = Math.min(index, maxIndex);
        this.removeFocusFromChipsExcept_(nextIndex);
        // After removing a chip, we should focus the trailing action for the next chip.
        this.adapter.focusChipTrailingActionAtIndex(nextIndex);
    };
    /**
     * Handles a chip navigation event.
     */
    MDCChipSetFoundation.prototype.handleChipNavigation = function (_a) {
        var chipId = _a.chipId, key = _a.key, source = _a.source;
        var maxIndex = this.adapter.getChipListCount() - 1;
        var index = this.adapter.getIndexOfChipById(chipId);
        // Early exit if the index is out of range or the key is unusable
        if (index === -1 || !navigationKeys.has(key)) {
            return;
        }
        var isRTL = this.adapter.isRTL();
        var isLeftKey = key === strings$o.ARROW_LEFT_KEY ||
            key === strings$o.IE_ARROW_LEFT_KEY;
        var isRightKey = key === strings$o.ARROW_RIGHT_KEY ||
            key === strings$o.IE_ARROW_RIGHT_KEY;
        var isDownKey = key === strings$o.ARROW_DOWN_KEY ||
            key === strings$o.IE_ARROW_DOWN_KEY;
        var shouldIncrement = !isRTL && isRightKey || isRTL && isLeftKey || isDownKey;
        var isHome = key === strings$o.HOME_KEY;
        var isEnd = key === strings$o.END_KEY;
        if (shouldIncrement) {
            index++;
        }
        else if (isHome) {
            index = 0;
        }
        else if (isEnd) {
            index = maxIndex;
        }
        else {
            index--;
        }
        // Early exit if the index is out of bounds
        if (index < 0 || index > maxIndex) {
            return;
        }
        this.removeFocusFromChipsExcept_(index);
        this.focusChipAction_(index, key, source);
    };
    MDCChipSetFoundation.prototype.focusChipAction_ = function (index, key, source) {
        var shouldJumpChips = jumpChipKeys.has(key);
        if (shouldJumpChips && source === EventSource.PRIMARY) {
            return this.adapter.focusChipPrimaryActionAtIndex(index);
        }
        if (shouldJumpChips && source === EventSource.TRAILING) {
            return this.adapter.focusChipTrailingActionAtIndex(index);
        }
        var dir = this.getDirection_(key);
        if (dir === Direction.LEFT) {
            return this.adapter.focusChipTrailingActionAtIndex(index);
        }
        if (dir === Direction.RIGHT) {
            return this.adapter.focusChipPrimaryActionAtIndex(index);
        }
    };
    MDCChipSetFoundation.prototype.getDirection_ = function (key) {
        var isRTL = this.adapter.isRTL();
        var isLeftKey = key === strings$o.ARROW_LEFT_KEY ||
            key === strings$o.IE_ARROW_LEFT_KEY;
        var isRightKey = key === strings$o.ARROW_RIGHT_KEY ||
            key === strings$o.IE_ARROW_RIGHT_KEY;
        if (!isRTL && isLeftKey || isRTL && isRightKey) {
            return Direction.LEFT;
        }
        return Direction.RIGHT;
    };
    /**
     * Deselects the chip with the given id and optionally notifies clients.
     */
    MDCChipSetFoundation.prototype.deselect_ = function (chipId, shouldNotifyClients) {
        if (shouldNotifyClients === void 0) { shouldNotifyClients = false; }
        var index = this.selectedChipIds_.indexOf(chipId);
        if (index >= 0) {
            this.selectedChipIds_.splice(index, 1);
            var chipIndex = this.adapter.getIndexOfChipById(chipId);
            this.adapter.selectChipAtIndex(chipIndex, /** isSelected */ false, shouldNotifyClients);
        }
    };
    /**
     * Deselects the chip with the given id and notifies clients.
     */
    MDCChipSetFoundation.prototype.deselectAndNotifyClients_ = function (chipId) {
        this.deselect_(chipId, true);
    };
    /**
     * Toggles selection of the chip with the given id.
     */
    MDCChipSetFoundation.prototype.toggleSelect_ = function (chipId) {
        if (this.selectedChipIds_.indexOf(chipId) >= 0) {
            this.deselectAndNotifyClients_(chipId);
        }
        else {
            this.selectAndNotifyClients_(chipId);
        }
    };
    MDCChipSetFoundation.prototype.removeFocusFromChipsExcept_ = function (index) {
        var chipCount = this.adapter.getChipListCount();
        for (var i = 0; i < chipCount; i++) {
            if (i !== index) {
                this.adapter.removeFocusFromChipAtIndex(i);
            }
        }
    };
    MDCChipSetFoundation.prototype.selectAndNotifyClients_ = function (chipId) {
        this.select_(chipId, true);
    };
    MDCChipSetFoundation.prototype.select_ = function (chipId, shouldNotifyClients) {
        if (this.selectedChipIds_.indexOf(chipId) >= 0) {
            return;
        }
        if (this.adapter.hasClass(cssClasses$l.CHOICE) &&
            this.selectedChipIds_.length > 0) {
            var previouslySelectedChip = this.selectedChipIds_[0];
            var previouslySelectedIndex = this.adapter.getIndexOfChipById(previouslySelectedChip);
            this.selectedChipIds_ = [];
            this.adapter.selectChipAtIndex(previouslySelectedIndex, /** isSelected */ false, shouldNotifyClients);
        }
        this.selectedChipIds_.push(chipId);
        var index = this.adapter.getIndexOfChipById(chipId);
        this.adapter.selectChipAtIndex(index, /** isSelected */ true, shouldNotifyClients);
    };
    return MDCChipSetFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var _a = MDCChipFoundation.strings, INTERACTION_EVENT = _a.INTERACTION_EVENT, SELECTION_EVENT = _a.SELECTION_EVENT, REMOVAL_EVENT = _a.REMOVAL_EVENT, NAVIGATION_EVENT = _a.NAVIGATION_EVENT;
var CHIP_SELECTOR = MDCChipSetFoundation.strings.CHIP_SELECTOR;
var idCounter = 0;
var MDCChipSet = /** @class */ (function (_super) {
    __extends(MDCChipSet, _super);
    function MDCChipSet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCChipSet.attachTo = function (root) {
        return new MDCChipSet(root);
    };
    Object.defineProperty(MDCChipSet.prototype, "chips", {
        get: function () {
            return this.chips_.slice();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCChipSet.prototype, "selectedChipIds", {
        /**
         * @return An array of the IDs of all selected chips.
         */
        get: function () {
            return this.foundation.getSelectedChipIds();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @param chipFactory A function which creates a new MDCChip.
     */
    MDCChipSet.prototype.initialize = function (chipFactory) {
        if (chipFactory === void 0) { chipFactory = function (el) { return new MDCChip(el); }; }
        this.chipFactory_ = chipFactory;
        this.chips_ = this.instantiateChips_(this.chipFactory_);
    };
    MDCChipSet.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.chips_.forEach(function (chip) {
            if (chip.id && chip.selected) {
                _this.foundation.select(chip.id);
            }
        });
        this.handleChipInteraction_ = function (evt) {
            return _this.foundation.handleChipInteraction(evt.detail);
        };
        this.handleChipSelection_ = function (evt) {
            return _this.foundation.handleChipSelection(evt.detail);
        };
        this.handleChipRemoval_ = function (evt) {
            return _this.foundation.handleChipRemoval(evt.detail);
        };
        this.handleChipNavigation_ = function (evt) {
            return _this.foundation.handleChipNavigation(evt.detail);
        };
        this.listen(INTERACTION_EVENT, this.handleChipInteraction_);
        this.listen(SELECTION_EVENT, this.handleChipSelection_);
        this.listen(REMOVAL_EVENT, this.handleChipRemoval_);
        this.listen(NAVIGATION_EVENT, this.handleChipNavigation_);
    };
    MDCChipSet.prototype.destroy = function () {
        this.chips_.forEach(function (chip) {
            chip.destroy();
        });
        this.unlisten(INTERACTION_EVENT, this.handleChipInteraction_);
        this.unlisten(SELECTION_EVENT, this.handleChipSelection_);
        this.unlisten(REMOVAL_EVENT, this.handleChipRemoval_);
        this.unlisten(NAVIGATION_EVENT, this.handleChipNavigation_);
        _super.prototype.destroy.call(this);
    };
    /**
     * Adds a new chip object to the chip set from the given chip element.
     */
    MDCChipSet.prototype.addChip = function (chipEl) {
        chipEl.id = chipEl.id || "mdc-chip-" + ++idCounter;
        this.chips_.push(this.chipFactory_(chipEl));
    };
    MDCChipSet.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            announceMessage: function (message) {
                announce(message);
            },
            focusChipPrimaryActionAtIndex: function (index) {
                _this.chips_[index].focusPrimaryAction();
            },
            focusChipTrailingActionAtIndex: function (index) {
                _this.chips_[index].focusTrailingAction();
            },
            getChipListCount: function () { return _this.chips_.length; },
            getIndexOfChipById: function (chipId) {
                return _this.findChipIndex_(chipId);
            },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            isRTL: function () { return window.getComputedStyle(_this.root).getPropertyValue('direction') === 'rtl'; },
            removeChipAtIndex: function (index) {
                if (index >= 0 && index < _this.chips_.length) {
                    _this.chips_[index].destroy();
                    _this.chips_[index].remove();
                    _this.chips_.splice(index, 1);
                }
            },
            removeFocusFromChipAtIndex: function (index) {
                _this.chips_[index].removeFocus();
            },
            selectChipAtIndex: function (index, selected, shouldNotifyClients) {
                if (index >= 0 && index < _this.chips_.length) {
                    _this.chips_[index].setSelectedFromChipSet(selected, shouldNotifyClients);
                }
            },
        };
        return new MDCChipSetFoundation(adapter);
    };
    /**
     * Instantiates chip components on all of the chip set's child chip elements.
     */
    MDCChipSet.prototype.instantiateChips_ = function (chipFactory) {
        var chipElements = [].slice.call(this.root.querySelectorAll(CHIP_SELECTOR));
        return chipElements.map(function (el) {
            el.id = el.id || "mdc-chip-" + ++idCounter;
            return chipFactory(el);
        });
    };
    /**
     * Returns the index of the chip with the given id, or -1 if the chip does not exist.
     */
    MDCChipSet.prototype.findChipIndex_ = function (chipId) {
        for (var i = 0; i < this.chips_.length; i++) {
            if (this.chips_[i].id === chipId) {
                return i;
            }
        }
        return -1;
    };
    return MDCChipSet;
}(MDCComponent));

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * CSS class names used in component.
 */
var cssClasses$k = {
    CELL: 'mdc-data-table__cell',
    CELL_NUMERIC: 'mdc-data-table__cell--numeric',
    CONTENT: 'mdc-data-table__content',
    HEADER_CELL: 'mdc-data-table__header-cell',
    HEADER_CELL_LABEL: 'mdc-data-table__header-cell-label',
    HEADER_CELL_SORTED: 'mdc-data-table__header-cell--sorted',
    HEADER_CELL_SORTED_DESCENDING: 'mdc-data-table__header-cell--sorted-descending',
    HEADER_CELL_WITH_SORT: 'mdc-data-table__header-cell--with-sort',
    HEADER_CELL_WRAPPER: 'mdc-data-table__header-cell-wrapper',
    HEADER_ROW: 'mdc-data-table__header-row',
    HEADER_ROW_CHECKBOX: 'mdc-data-table__header-row-checkbox',
    IN_PROGRESS: 'mdc-data-table--in-progress',
    PROGRESS_INDICATOR: 'mdc-data-table__progress-indicator',
    ROOT: 'mdc-data-table',
    ROW: 'mdc-data-table__row',
    ROW_CHECKBOX: 'mdc-data-table__row-checkbox',
    ROW_SELECTED: 'mdc-data-table__row--selected',
    SORT_ICON_BUTTON: 'mdc-data-table__sort-icon-button',
    SORT_STATUS_LABEL: 'mdc-data-table__sort-status-label',
    PAGINATION_ROWS_PER_PAGE_SELECT: 'mdc-data-table__pagination-rows-per-page-select',
    PAGINATION_ROWS_PER_PAGE_LABEL: 'mdc-data-table__pagination-rows-per-page-label',
};
/**
 * DOM attributes used in component.
 */
var attributes = {
    ARIA_SELECTED: 'aria-selected',
    ARIA_SORT: 'aria-sort',
};
/**
 * List of data attributes used in component.
 */
var dataAttributes = {
    COLUMN_ID: 'data-column-id',
    ROW_ID: 'data-row-id',
};
/**
 * CSS selectors used in component.
 */
var selectors = {
    CONTENT: "." + cssClasses$k.CONTENT,
    HEADER_CELL: "." + cssClasses$k.HEADER_CELL,
    HEADER_CELL_WITH_SORT: "." + cssClasses$k.HEADER_CELL_WITH_SORT,
    HEADER_ROW: "." + cssClasses$k.HEADER_ROW,
    HEADER_ROW_CHECKBOX: "." + cssClasses$k.HEADER_ROW_CHECKBOX,
    PROGRESS_INDICATOR: "." + cssClasses$k.PROGRESS_INDICATOR,
    ROW: "." + cssClasses$k.ROW,
    ROW_CHECKBOX: "." + cssClasses$k.ROW_CHECKBOX,
    ROW_SELECTED: "." + cssClasses$k.ROW_SELECTED,
    SORT_ICON_BUTTON: "." + cssClasses$k.SORT_ICON_BUTTON,
    SORT_STATUS_LABEL: "." + cssClasses$k.SORT_STATUS_LABEL,
};
/**
 * Messages used in component.
 */
var messages = {
    SORTED_IN_DESCENDING: 'Sorted in descending order',
    SORTED_IN_ASCENDING: 'Sorted in ascending order',
};
/**
 * Attributes and selectors used in component.
 * @deprecated Use `attributes`, `dataAttributes` and `selectors` instead.
 */
var strings$m = {
    ARIA_SELECTED: attributes.ARIA_SELECTED,
    ARIA_SORT: attributes.ARIA_SORT,
    DATA_ROW_ID_ATTR: dataAttributes.ROW_ID,
    HEADER_ROW_CHECKBOX_SELECTOR: selectors.HEADER_ROW_CHECKBOX,
    ROW_CHECKBOX_SELECTOR: selectors.ROW_CHECKBOX,
    ROW_SELECTED_SELECTOR: selectors.ROW_SELECTED,
    ROW_SELECTOR: selectors.ROW,
};
/**
 * Sort values defined by ARIA.
 * See https://www.w3.org/WAI/PF/aria/states_and_properties#aria-sort
 */
var SortValue;
(function (SortValue) {
    // Items are sorted in ascending order by this column.
    SortValue["ASCENDING"] = "ascending";
    // Items are sorted in descending order by this column.
    SortValue["DESCENDING"] = "descending";
    // There is no defined sort applied to the column.
    SortValue["NONE"] = "none";
    // A sort algorithm other than ascending or descending has been applied.
    SortValue["OTHER"] = "other";
})(SortValue || (SortValue = {}));
/**
 * Event names used in component.
 */
var events = {
    ROW_SELECTION_CHANGED: 'MDCDataTable:rowSelectionChanged',
    SELECTED_ALL: 'MDCDataTable:selectedAll',
    UNSELECTED_ALL: 'MDCDataTable:unselectedAll',
    SORTED: 'MDCDataTable:sorted',
};

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * The Foundation of data table component containing pure business logic, any
 * logic requiring DOM manipulation are delegated to adapter methods.
 */
var MDCDataTableFoundation = /** @class */ (function (_super) {
    __extends(MDCDataTableFoundation, _super);
    function MDCDataTableFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCDataTableFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCDataTableFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                addClassAtRowIndex: function () { return undefined; },
                getAttributeByHeaderCellIndex: function () { return ''; },
                getHeaderCellCount: function () { return 0; },
                getHeaderCellElements: function () { return []; },
                getRowCount: function () { return 0; },
                getRowElements: function () { return []; },
                getRowIdAtIndex: function () { return ''; },
                getRowIndexByChildElement: function () { return 0; },
                getSelectedRowCount: function () { return 0; },
                getTableBodyHeight: function () { return ''; },
                getTableHeaderHeight: function () { return ''; },
                isCheckboxAtRowIndexChecked: function () { return false; },
                isHeaderRowCheckboxChecked: function () { return false; },
                isRowsSelectable: function () { return false; },
                notifyRowSelectionChanged: function () { return undefined; },
                notifySelectedAll: function () { return undefined; },
                notifySortAction: function () { return undefined; },
                notifyUnselectedAll: function () { return undefined; },
                registerHeaderRowCheckbox: function () { return undefined; },
                registerRowCheckboxes: function () { return undefined; },
                removeClass: function () { return undefined; },
                removeClassAtRowIndex: function () { return undefined; },
                removeClassNameByHeaderCellIndex: function () { return undefined; },
                setAttributeAtRowIndex: function () { return undefined; },
                setAttributeByHeaderCellIndex: function () { return undefined; },
                setClassNameByHeaderCellIndex: function () { return undefined; },
                setHeaderRowCheckboxChecked: function () { return undefined; },
                setHeaderRowCheckboxIndeterminate: function () { return undefined; },
                setProgressIndicatorStyles: function () { return undefined; },
                setRowCheckboxCheckedAtIndex: function () { return undefined; },
                setSortStatusLabelByHeaderCellIndex: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
     * Use this if registering checkbox is synchronous.
     */
    MDCDataTableFoundation.prototype.layout = function () {
        if (this.adapter.isRowsSelectable()) {
            this.adapter.registerHeaderRowCheckbox();
            this.adapter.registerRowCheckboxes();
            this.setHeaderRowCheckboxState();
        }
    };
    /**
     * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
     * Use this if registering checkbox is asynchronous.
     */
    MDCDataTableFoundation.prototype.layoutAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.adapter.isRowsSelectable()) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.adapter.registerHeaderRowCheckbox()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.adapter.registerRowCheckboxes()];
                    case 2:
                        _a.sent();
                        this.setHeaderRowCheckboxState();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @return Returns array of row elements.
     */
    MDCDataTableFoundation.prototype.getRows = function () {
        return this.adapter.getRowElements();
    };
    /**
     * @return Array of header cell elements.
     */
    MDCDataTableFoundation.prototype.getHeaderCells = function () {
        return this.adapter.getHeaderCellElements();
    };
    /**
     * Sets selected row ids. Overwrites previously selected rows.
     * @param rowIds Array of row ids that needs to be selected.
     */
    MDCDataTableFoundation.prototype.setSelectedRowIds = function (rowIds) {
        for (var rowIndex = 0; rowIndex < this.adapter.getRowCount(); rowIndex++) {
            var rowId = this.adapter.getRowIdAtIndex(rowIndex);
            var isSelected = false;
            if (rowId && rowIds.indexOf(rowId) >= 0) {
                isSelected = true;
            }
            this.adapter.setRowCheckboxCheckedAtIndex(rowIndex, isSelected);
            this.selectRowAtIndex(rowIndex, isSelected);
        }
        this.setHeaderRowCheckboxState();
    };
    /**
     * @return Returns array of all row ids.
     */
    MDCDataTableFoundation.prototype.getRowIds = function () {
        var rowIds = [];
        for (var rowIndex = 0; rowIndex < this.adapter.getRowCount(); rowIndex++) {
            rowIds.push(this.adapter.getRowIdAtIndex(rowIndex));
        }
        return rowIds;
    };
    /**
     * @return Returns array of selected row ids.
     */
    MDCDataTableFoundation.prototype.getSelectedRowIds = function () {
        var selectedRowIds = [];
        for (var rowIndex = 0; rowIndex < this.adapter.getRowCount(); rowIndex++) {
            if (this.adapter.isCheckboxAtRowIndexChecked(rowIndex)) {
                selectedRowIds.push(this.adapter.getRowIdAtIndex(rowIndex));
            }
        }
        return selectedRowIds;
    };
    /**
     * Handles header row checkbox change event.
     */
    MDCDataTableFoundation.prototype.handleHeaderRowCheckboxChange = function () {
        var isHeaderChecked = this.adapter.isHeaderRowCheckboxChecked();
        for (var rowIndex = 0; rowIndex < this.adapter.getRowCount(); rowIndex++) {
            this.adapter.setRowCheckboxCheckedAtIndex(rowIndex, isHeaderChecked);
            this.selectRowAtIndex(rowIndex, isHeaderChecked);
        }
        if (isHeaderChecked) {
            this.adapter.notifySelectedAll();
        }
        else {
            this.adapter.notifyUnselectedAll();
        }
    };
    /**
     * Handles change event originated from row checkboxes.
     */
    MDCDataTableFoundation.prototype.handleRowCheckboxChange = function (event) {
        var rowIndex = this.adapter.getRowIndexByChildElement(event.target);
        if (rowIndex === -1) {
            return;
        }
        var selected = this.adapter.isCheckboxAtRowIndexChecked(rowIndex);
        this.selectRowAtIndex(rowIndex, selected);
        this.setHeaderRowCheckboxState();
        var rowId = this.adapter.getRowIdAtIndex(rowIndex);
        this.adapter.notifyRowSelectionChanged({ rowId: rowId, rowIndex: rowIndex, selected: selected });
    };
    /**
     * Handles sort action on sortable header cell.
     */
    MDCDataTableFoundation.prototype.handleSortAction = function (eventData) {
        var columnId = eventData.columnId, columnIndex = eventData.columnIndex, headerCell = eventData.headerCell;
        // Reset sort attributes / classes on other header cells.
        for (var index = 0; index < this.adapter.getHeaderCellCount(); index++) {
            if (index === columnIndex) {
                continue;
            }
            this.adapter.removeClassNameByHeaderCellIndex(index, cssClasses$k.HEADER_CELL_SORTED);
            this.adapter.removeClassNameByHeaderCellIndex(index, cssClasses$k.HEADER_CELL_SORTED_DESCENDING);
            this.adapter.setAttributeByHeaderCellIndex(index, strings$m.ARIA_SORT, SortValue.NONE);
            this.adapter.setSortStatusLabelByHeaderCellIndex(index, SortValue.NONE);
        }
        // Set appropriate sort attributes / classes on target header cell.
        this.adapter.setClassNameByHeaderCellIndex(columnIndex, cssClasses$k.HEADER_CELL_SORTED);
        var currentSortValue = this.adapter.getAttributeByHeaderCellIndex(columnIndex, strings$m.ARIA_SORT);
        var sortValue = SortValue.NONE;
        // Set to descending if sorted on ascending order.
        if (currentSortValue === SortValue.ASCENDING) {
            this.adapter.setClassNameByHeaderCellIndex(columnIndex, cssClasses$k.HEADER_CELL_SORTED_DESCENDING);
            this.adapter.setAttributeByHeaderCellIndex(columnIndex, strings$m.ARIA_SORT, SortValue.DESCENDING);
            sortValue = SortValue.DESCENDING;
            // Set to ascending if sorted on descending order.
        }
        else if (currentSortValue === SortValue.DESCENDING) {
            this.adapter.removeClassNameByHeaderCellIndex(columnIndex, cssClasses$k.HEADER_CELL_SORTED_DESCENDING);
            this.adapter.setAttributeByHeaderCellIndex(columnIndex, strings$m.ARIA_SORT, SortValue.ASCENDING);
            sortValue = SortValue.ASCENDING;
        }
        else {
            // Set to ascending by default when not sorted.
            this.adapter.setAttributeByHeaderCellIndex(columnIndex, strings$m.ARIA_SORT, SortValue.ASCENDING);
            sortValue = SortValue.ASCENDING;
        }
        this.adapter.setSortStatusLabelByHeaderCellIndex(columnIndex, sortValue);
        this.adapter.notifySortAction({
            columnId: columnId,
            columnIndex: columnIndex,
            headerCell: headerCell,
            sortValue: sortValue,
        });
    };
    /**
     * Shows progress indicator blocking only the table body content when in
     * loading state.
     */
    MDCDataTableFoundation.prototype.showProgress = function () {
        var height = this.adapter.getTableBodyHeight();
        var top = this.adapter.getTableHeaderHeight();
        this.adapter.setProgressIndicatorStyles({
            height: height,
            top: top,
        });
        this.adapter.addClass(cssClasses$k.IN_PROGRESS);
    };
    /**
     * Hides progress indicator when data table is finished loading.
     */
    MDCDataTableFoundation.prototype.hideProgress = function () {
        this.adapter.removeClass(cssClasses$k.IN_PROGRESS);
    };
    /**
     * Updates header row checkbox state based on number of rows selected.
     */
    MDCDataTableFoundation.prototype.setHeaderRowCheckboxState = function () {
        if (this.adapter.getSelectedRowCount() === this.adapter.getRowCount()) {
            this.adapter.setHeaderRowCheckboxChecked(true);
            this.adapter.setHeaderRowCheckboxIndeterminate(false);
        }
        else if (this.adapter.getSelectedRowCount() === 0) {
            this.adapter.setHeaderRowCheckboxIndeterminate(false);
            this.adapter.setHeaderRowCheckboxChecked(false);
        }
        else {
            this.adapter.setHeaderRowCheckboxIndeterminate(true);
            this.adapter.setHeaderRowCheckboxChecked(false);
        }
    };
    /**
     * Sets the attributes of row element based on selection state.
     */
    MDCDataTableFoundation.prototype.selectRowAtIndex = function (rowIndex, selected) {
        if (selected) {
            this.adapter.addClassAtRowIndex(rowIndex, cssClasses$k.ROW_SELECTED);
            this.adapter.setAttributeAtRowIndex(rowIndex, strings$m.ARIA_SELECTED, 'true');
        }
        else {
            this.adapter.removeClassAtRowIndex(rowIndex, cssClasses$k.ROW_SELECTED);
            this.adapter.setAttributeAtRowIndex(rowIndex, strings$m.ARIA_SELECTED, 'false');
        }
    };
    return MDCDataTableFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Implementation of `MDCDataTableFoundation`
 */
var MDCDataTable = /** @class */ (function (_super) {
    __extends(MDCDataTable, _super);
    function MDCDataTable() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCDataTable.attachTo = function (root) {
        return new MDCDataTable(root);
    };
    MDCDataTable.prototype.initialize = function (checkboxFactory) {
        if (checkboxFactory === void 0) { checkboxFactory = function (el) { return new MDCCheckbox(el); }; }
        this.checkboxFactory = checkboxFactory;
    };
    MDCDataTable.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.headerRow =
            this.root.querySelector("." + cssClasses$k.HEADER_ROW);
        this.handleHeaderRowCheckboxChange = function () {
            return _this.foundation.handleHeaderRowCheckboxChange();
        };
        this.headerRow.addEventListener('change', this.handleHeaderRowCheckboxChange);
        this.headerRowClickListener = function (event) {
            _this.handleHeaderRowClick(event);
        };
        this.headerRow.addEventListener('click', this.headerRowClickListener);
        this.content =
            this.root.querySelector("." + cssClasses$k.CONTENT);
        this.handleRowCheckboxChange = function (event) {
            return _this.foundation.handleRowCheckboxChange(event);
        };
        this.content.addEventListener('change', this.handleRowCheckboxChange);
        this.layout();
    };
    /**
     * Re-initializes header row checkbox and row checkboxes when selectable rows are added or removed from table.
     */
    MDCDataTable.prototype.layout = function () {
        this.foundation.layout();
    };
    /**
     * @return Returns array of header row cell elements.
     */
    MDCDataTable.prototype.getHeaderCells = function () {
        return [].slice.call(this.root.querySelectorAll(selectors.HEADER_CELL));
    };
    /**
     * @return Returns array of row elements.
     */
    MDCDataTable.prototype.getRows = function () {
        return this.foundation.getRows();
    };
    /**
     * @return Returns array of selected row ids.
     */
    MDCDataTable.prototype.getSelectedRowIds = function () {
        return this.foundation.getSelectedRowIds();
    };
    /**
     * Sets selected row ids. Overwrites previously selected rows.
     * @param rowIds Array of row ids that needs to be selected.
     */
    MDCDataTable.prototype.setSelectedRowIds = function (rowIds) {
        this.foundation.setSelectedRowIds(rowIds);
    };
    MDCDataTable.prototype.destroy = function () {
        this.headerRow.removeEventListener('change', this.handleHeaderRowCheckboxChange);
        this.headerRow.removeEventListener('click', this.headerRowClickListener);
        this.content.removeEventListener('change', this.handleRowCheckboxChange);
        this.headerRowCheckbox.destroy();
        this.rowCheckboxList.forEach(function (checkbox) {
            checkbox.destroy();
        });
    };
    MDCDataTable.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) {
                _this.root.classList.add(className);
            },
            removeClass: function (className) {
                _this.root.classList.remove(className);
            },
            getHeaderCellElements: function () { return _this.getHeaderCells(); },
            getHeaderCellCount: function () { return _this.getHeaderCells().length; },
            getAttributeByHeaderCellIndex: function (index, attribute) {
                return _this.getHeaderCells()[index].getAttribute(attribute);
            },
            setAttributeByHeaderCellIndex: function (index, attribute, value) {
                _this.getHeaderCells()[index].setAttribute(attribute, value);
            },
            setClassNameByHeaderCellIndex: function (index, className) {
                _this.getHeaderCells()[index].classList.add(className);
            },
            removeClassNameByHeaderCellIndex: function (index, className) {
                _this.getHeaderCells()[index].classList.remove(className);
            },
            notifySortAction: function (data) {
                _this.emit(events.SORTED, data, /** shouldBubble */ true);
            },
            getTableBodyHeight: function () {
                var tableBody = _this.root.querySelector(selectors.CONTENT);
                if (!tableBody) {
                    throw new Error('MDCDataTable: Table body element not found.');
                }
                return tableBody.getBoundingClientRect().height + "px";
            },
            getTableHeaderHeight: function () {
                var tableHeader = _this.root.querySelector(selectors.HEADER_ROW);
                if (!tableHeader) {
                    throw new Error('MDCDataTable: Table header element not found.');
                }
                return tableHeader.getBoundingClientRect().height + "px";
            },
            setProgressIndicatorStyles: function (styles) {
                var progressIndicator = _this.root.querySelector(selectors.PROGRESS_INDICATOR);
                if (!progressIndicator) {
                    throw new Error('MDCDataTable: Progress indicator element not found.');
                }
                Object.assign(progressIndicator.style, styles);
            },
            addClassAtRowIndex: function (rowIndex, className) {
                _this.getRows()[rowIndex].classList.add(className);
            },
            getRowCount: function () { return _this.getRows().length; },
            getRowElements: function () { return [].slice.call(_this.root.querySelectorAll(selectors.ROW)); },
            getRowIdAtIndex: function (rowIndex) {
                return _this.getRows()[rowIndex].getAttribute(dataAttributes.ROW_ID);
            },
            getRowIndexByChildElement: function (el) {
                return _this.getRows().indexOf(closest(el, selectors.ROW));
            },
            getSelectedRowCount: function () {
                return _this.root.querySelectorAll(selectors.ROW_SELECTED).length;
            },
            isCheckboxAtRowIndexChecked: function (rowIndex) {
                return _this.rowCheckboxList[rowIndex].checked;
            },
            isHeaderRowCheckboxChecked: function () { return _this.headerRowCheckbox.checked; },
            isRowsSelectable: function () { return !!_this.root.querySelector(selectors.ROW_CHECKBOX); },
            notifyRowSelectionChanged: function (data) {
                _this.emit(events.ROW_SELECTION_CHANGED, {
                    row: _this.getRowByIndex(data.rowIndex),
                    rowId: _this.getRowIdByIndex(data.rowIndex),
                    rowIndex: data.rowIndex,
                    selected: data.selected,
                }, 
                /** shouldBubble */ true);
            },
            notifySelectedAll: function () {
                _this.emit(events.SELECTED_ALL, {}, /** shouldBubble */ true);
            },
            notifyUnselectedAll: function () {
                _this.emit(events.UNSELECTED_ALL, {}, /** shouldBubble */ true);
            },
            registerHeaderRowCheckbox: function () {
                if (_this.headerRowCheckbox) {
                    _this.headerRowCheckbox.destroy();
                }
                var checkboxEl = _this.root.querySelector(selectors.HEADER_ROW_CHECKBOX);
                _this.headerRowCheckbox = _this.checkboxFactory(checkboxEl);
            },
            registerRowCheckboxes: function () {
                if (_this.rowCheckboxList) {
                    _this.rowCheckboxList.forEach(function (checkbox) {
                        checkbox.destroy();
                    });
                }
                _this.rowCheckboxList = [];
                _this.getRows().forEach(function (rowEl) {
                    var checkbox = _this.checkboxFactory(rowEl.querySelector(selectors.ROW_CHECKBOX));
                    _this.rowCheckboxList.push(checkbox);
                });
            },
            removeClassAtRowIndex: function (rowIndex, className) {
                _this.getRows()[rowIndex].classList.remove(className);
            },
            setAttributeAtRowIndex: function (rowIndex, attr, value) {
                _this.getRows()[rowIndex].setAttribute(attr, value);
            },
            setHeaderRowCheckboxChecked: function (checked) {
                _this.headerRowCheckbox.checked = checked;
            },
            setHeaderRowCheckboxIndeterminate: function (indeterminate) {
                _this.headerRowCheckbox.indeterminate = indeterminate;
            },
            setRowCheckboxCheckedAtIndex: function (rowIndex, checked) {
                _this.rowCheckboxList[rowIndex].checked = checked;
            },
            setSortStatusLabelByHeaderCellIndex: function (columnIndex, sortValue) {
                var headerCell = _this.getHeaderCells()[columnIndex];
                var sortStatusLabel = headerCell.querySelector(selectors.SORT_STATUS_LABEL);
                if (!sortStatusLabel)
                    return;
                sortStatusLabel.textContent =
                    _this.getSortStatusMessageBySortValue(sortValue);
            },
        };
        return new MDCDataTableFoundation(adapter);
    };
    MDCDataTable.prototype.getRowByIndex = function (index) {
        return this.getRows()[index];
    };
    MDCDataTable.prototype.getRowIdByIndex = function (index) {
        return this.getRowByIndex(index).getAttribute(dataAttributes.ROW_ID);
    };
    MDCDataTable.prototype.handleHeaderRowClick = function (event) {
        var headerCell = closest(event.target, selectors.HEADER_CELL_WITH_SORT);
        if (!headerCell) {
            return;
        }
        var columnId = headerCell.getAttribute(dataAttributes.COLUMN_ID);
        var columnIndex = this.getHeaderCells().indexOf(headerCell);
        if (columnIndex === -1) {
            return;
        }
        this.foundation.handleSortAction({ columnId: columnId, columnIndex: columnIndex, headerCell: headerCell });
    };
    MDCDataTable.prototype.getSortStatusMessageBySortValue = function (sortValue) {
        switch (sortValue) {
            case SortValue.ASCENDING:
                return messages.SORTED_IN_ASCENDING;
            case SortValue.DESCENDING:
                return messages.SORTED_IN_DESCENDING;
            default:
                return '';
        }
    };
    return MDCDataTable;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$j = {
    LIST_ITEM_ACTIVATED_CLASS: 'mdc-list-item--activated',
    LIST_ITEM_CLASS: 'mdc-list-item',
    LIST_ITEM_DISABLED_CLASS: 'mdc-list-item--disabled',
    LIST_ITEM_SELECTED_CLASS: 'mdc-list-item--selected',
    LIST_ITEM_TEXT_CLASS: 'mdc-list-item__text',
    LIST_ITEM_PRIMARY_TEXT_CLASS: 'mdc-list-item__primary-text',
    ROOT: 'mdc-list',
};
var strings$l = {
    ACTION_EVENT: 'MDCList:action',
    ARIA_CHECKED: 'aria-checked',
    ARIA_CHECKED_CHECKBOX_SELECTOR: '[role="checkbox"][aria-checked="true"]',
    ARIA_CHECKED_RADIO_SELECTOR: '[role="radio"][aria-checked="true"]',
    ARIA_CURRENT: 'aria-current',
    ARIA_DISABLED: 'aria-disabled',
    ARIA_ORIENTATION: 'aria-orientation',
    ARIA_ORIENTATION_HORIZONTAL: 'horizontal',
    ARIA_ROLE_CHECKBOX_SELECTOR: '[role="checkbox"]',
    ARIA_SELECTED: 'aria-selected',
    CHECKBOX_RADIO_SELECTOR: 'input[type="checkbox"], input[type="radio"]',
    CHECKBOX_SELECTOR: 'input[type="checkbox"]',
    CHILD_ELEMENTS_TO_TOGGLE_TABINDEX: "\n    ." + cssClasses$j.LIST_ITEM_CLASS + " button:not(:disabled),\n    ." + cssClasses$j.LIST_ITEM_CLASS + " a\n  ",
    FOCUSABLE_CHILD_ELEMENTS: "\n    ." + cssClasses$j.LIST_ITEM_CLASS + " button:not(:disabled),\n    ." + cssClasses$j.LIST_ITEM_CLASS + " a,\n    ." + cssClasses$j.LIST_ITEM_CLASS + " input[type=\"radio\"]:not(:disabled),\n    ." + cssClasses$j.LIST_ITEM_CLASS + " input[type=\"checkbox\"]:not(:disabled)\n  ",
    RADIO_SELECTOR: 'input[type="radio"]',
};
var numbers$7 = {
    UNSET_INDEX: -1,
    TYPEAHEAD_BUFFER_CLEAR_TIMEOUT_MS: 300
};

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var ELEMENTS_KEY_ALLOWED_IN = ['input', 'button', 'textarea', 'select'];
/**
 * Ensures that preventDefault is only called if the containing element
 * doesn't consume the event, and it will cause an unintended scroll.
 *
 * @param evt keyboard event to be prevented.
 */
var preventDefaultEvent = function (evt) {
    var target = evt.target;
    if (!target) {
        return;
    }
    var tagName = ("" + target.tagName).toLowerCase();
    if (ELEMENTS_KEY_ALLOWED_IN.indexOf(tagName) === -1) {
        evt.preventDefault();
    }
};

/**
 * @license
 * Copyright 2020 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Initializes a state object for typeahead. Use the same reference for calls to
 * typeahead functions.
 *
 * @return The current state of the typeahead process. Each state reference
 *     represents a typeahead instance as the reference is typically mutated
 *     in-place.
 */
function initState() {
    var state = {
        bufferClearTimeout: 0,
        currentFirstChar: '',
        sortedIndexCursor: 0,
        typeaheadBuffer: '',
    };
    return state;
}
/**
 * Initializes typeahead state by indexing the current list items by primary
 * text into the sortedIndexByFirstChar data structure.
 *
 * @param listItemCount numer of items in the list
 * @param getPrimaryTextByItemIndex function that returns the primary text at a
 *     given index
 *
 * @return Map that maps the first character of the primary text to the full
 *     list text and it's index
 */
function initSortedIndex(listItemCount, getPrimaryTextByItemIndex) {
    var sortedIndexByFirstChar = new Map();
    // Aggregate item text to index mapping
    for (var i = 0; i < listItemCount; i++) {
        var primaryText = getPrimaryTextByItemIndex(i).trim();
        if (!primaryText) {
            continue;
        }
        var firstChar = primaryText[0].toLowerCase();
        if (!sortedIndexByFirstChar.has(firstChar)) {
            sortedIndexByFirstChar.set(firstChar, []);
        }
        sortedIndexByFirstChar.get(firstChar).push({ text: primaryText.toLowerCase(), index: i });
    }
    // Sort the mapping
    // TODO(b/157162694): Investigate replacing forEach with Map.values()
    sortedIndexByFirstChar.forEach(function (values) {
        values.sort(function (first, second) {
            return first.index - second.index;
        });
    });
    return sortedIndexByFirstChar;
}
/**
 * Given the next desired character from the user, it attempts to find the next
 * list option matching the buffer. Wraps around if at the end of options.
 *
 * @param opts Options and accessors
 *   - nextChar - the next character to match against items
 *   - sortedIndexByFirstChar - output of `initSortedIndex(...)`
 *   - focusedItemIndex - the index of the currently focused item
 *   - focusItemAtIndex - function that focuses a list item at given index
 *   - skipFocus - whether or not to focus the matched item
 *   - isItemAtIndexDisabled - function that determines whether an item at a
 *        given index is disabled
 * @param state The typeahead state instance. See `initState`.
 *
 * @return The index of the matched item, or -1 if no match.
 */
function matchItem(opts, state) {
    var nextChar = opts.nextChar, focusItemAtIndex = opts.focusItemAtIndex, sortedIndexByFirstChar = opts.sortedIndexByFirstChar, focusedItemIndex = opts.focusedItemIndex, skipFocus = opts.skipFocus, isItemAtIndexDisabled = opts.isItemAtIndexDisabled;
    clearTimeout(state.bufferClearTimeout);
    state.bufferClearTimeout = setTimeout(function () {
        clearBuffer(state);
    }, numbers$7.TYPEAHEAD_BUFFER_CLEAR_TIMEOUT_MS);
    state.typeaheadBuffer = state.typeaheadBuffer + nextChar;
    var index;
    if (state.typeaheadBuffer.length === 1) {
        index = matchFirstChar(sortedIndexByFirstChar, focusedItemIndex, isItemAtIndexDisabled, state);
    }
    else {
        index = matchAllChars(sortedIndexByFirstChar, isItemAtIndexDisabled, state);
    }
    if (index !== -1 && !skipFocus) {
        focusItemAtIndex(index);
    }
    return index;
}
/**
 * Matches the user's single input character in the buffer to the
 * next option that begins with such character. Wraps around if at
 * end of options. Returns -1 if no match is found.
 */
function matchFirstChar(sortedIndexByFirstChar, focusedItemIndex, isItemAtIndexDisabled, state) {
    var firstChar = state.typeaheadBuffer[0];
    var itemsMatchingFirstChar = sortedIndexByFirstChar.get(firstChar);
    if (!itemsMatchingFirstChar) {
        return -1;
    }
    // Has the same firstChar been recently matched?
    // Also, did starting index remain the same between key presses?
    // If both hold true, simply increment index.
    if (firstChar === state.currentFirstChar &&
        itemsMatchingFirstChar[state.sortedIndexCursor].index ===
            focusedItemIndex) {
        state.sortedIndexCursor =
            (state.sortedIndexCursor + 1) % itemsMatchingFirstChar.length;
        var newIndex = itemsMatchingFirstChar[state.sortedIndexCursor].index;
        if (!isItemAtIndexDisabled(newIndex)) {
            return newIndex;
        }
    }
    // If we're here, it means one of the following happened:
    // - either firstChar or startingIndex has changed, invalidating the
    // cursor.
    // - The next item of typeahead is disabled, so we have to look further.
    state.currentFirstChar = firstChar;
    var newCursorPosition = -1;
    var cursorPosition;
    // Find the first non-disabled item as a fallback.
    for (cursorPosition = 0; cursorPosition < itemsMatchingFirstChar.length; cursorPosition++) {
        if (!isItemAtIndexDisabled(itemsMatchingFirstChar[cursorPosition].index)) {
            newCursorPosition = cursorPosition;
            break;
        }
    }
    // Advance cursor to first item matching the firstChar that is positioned
    // after starting item. Cursor is unchanged from fallback if there's no
    // such item.
    for (; cursorPosition < itemsMatchingFirstChar.length; cursorPosition++) {
        if (itemsMatchingFirstChar[cursorPosition].index > focusedItemIndex &&
            !isItemAtIndexDisabled(itemsMatchingFirstChar[cursorPosition].index)) {
            newCursorPosition = cursorPosition;
            break;
        }
    }
    if (newCursorPosition !== -1) {
        state.sortedIndexCursor = newCursorPosition;
        return itemsMatchingFirstChar[state.sortedIndexCursor].index;
    }
    return -1;
}
/**
 * Attempts to find the next item that matches all of the typeahead buffer.
 * Wraps around if at end of options. Returns -1 if no match is found.
 */
function matchAllChars(sortedIndexByFirstChar, isItemAtIndexDisabled, state) {
    var firstChar = state.typeaheadBuffer[0];
    var itemsMatchingFirstChar = sortedIndexByFirstChar.get(firstChar);
    if (!itemsMatchingFirstChar) {
        return -1;
    }
    // Do nothing if text already matches
    var startingItem = itemsMatchingFirstChar[state.sortedIndexCursor];
    if (startingItem.text.lastIndexOf(state.typeaheadBuffer, 0) === 0 &&
        !isItemAtIndexDisabled(startingItem.index)) {
        return startingItem.index;
    }
    // Find next item that matches completely; if no match, we'll eventually
    // loop around to same position
    var cursorPosition = (state.sortedIndexCursor + 1) % itemsMatchingFirstChar.length;
    var nextCursorPosition = -1;
    while (cursorPosition !== state.sortedIndexCursor) {
        var currentItem = itemsMatchingFirstChar[cursorPosition];
        var matches = currentItem.text.lastIndexOf(state.typeaheadBuffer, 0) === 0;
        var isEnabled = !isItemAtIndexDisabled(currentItem.index);
        if (matches && isEnabled) {
            nextCursorPosition = cursorPosition;
            break;
        }
        cursorPosition = (cursorPosition + 1) % itemsMatchingFirstChar.length;
    }
    if (nextCursorPosition !== -1) {
        state.sortedIndexCursor = nextCursorPosition;
        return itemsMatchingFirstChar[state.sortedIndexCursor].index;
    }
    return -1;
}
/**
 * Whether or not the given typeahead instaance state is currently typing.
 *
 * @param state The typeahead state instance. See `initState`.
 */
function isTypingInProgress(state) {
    return state.typeaheadBuffer.length > 0;
}
/**
 * Clears the typeahaed buffer so that it resets item matching to the first
 * character.
 *
 * @param state The typeahead state instance. See `initState`.
 */
function clearBuffer(state) {
    state.typeaheadBuffer = '';
}
/**
 * Given a keydown event, it calculates whether or not to automatically focus a
 * list item depending on what was typed mimicing the typeahead functionality of
 * a standard <select> element that is open.
 *
 * @param opts Options and accessors
 *   - event - the KeyboardEvent to handle and parse
 *   - sortedIndexByFirstChar - output of `initSortedIndex(...)`
 *   - focusedItemIndex - the index of the currently focused item
 *   - focusItemAtIndex - function that focuses a list item at given index
 *   - isItemAtFocusedIndexDisabled - whether or not the currently focused item
 *      is disabled
 *   - isTargetListItem - whether or not the event target is a list item
 * @param state The typeahead state instance. See `initState`.
 *
 * @returns index of the item matched by the keydown. -1 if not matched.
 */
function handleKeydown(opts, state) {
    var event = opts.event, isTargetListItem = opts.isTargetListItem, focusedItemIndex = opts.focusedItemIndex, focusItemAtIndex = opts.focusItemAtIndex, sortedIndexByFirstChar = opts.sortedIndexByFirstChar, isItemAtIndexDisabled = opts.isItemAtIndexDisabled;
    var isArrowLeft = normalizeKey(event) === 'ArrowLeft';
    var isArrowUp = normalizeKey(event) === 'ArrowUp';
    var isArrowRight = normalizeKey(event) === 'ArrowRight';
    var isArrowDown = normalizeKey(event) === 'ArrowDown';
    var isHome = normalizeKey(event) === 'Home';
    var isEnd = normalizeKey(event) === 'End';
    var isEnter = normalizeKey(event) === 'Enter';
    var isSpace = normalizeKey(event) === 'Spacebar';
    if (isArrowLeft || isArrowUp || isArrowRight || isArrowDown || isHome ||
        isEnd || isEnter) {
        return -1;
    }
    var isCharacterKey = !isSpace && event.key.length === 1;
    if (isCharacterKey) {
        preventDefaultEvent(event);
        var matchItemOpts = {
            focusItemAtIndex: focusItemAtIndex,
            focusedItemIndex: focusedItemIndex,
            nextChar: event.key.toLowerCase(),
            sortedIndexByFirstChar: sortedIndexByFirstChar,
            skipFocus: false,
            isItemAtIndexDisabled: isItemAtIndexDisabled,
        };
        return matchItem(matchItemOpts, state);
    }
    if (!isSpace) {
        return -1;
    }
    if (isTargetListItem) {
        preventDefaultEvent(event);
    }
    var typeaheadOnListItem = isTargetListItem && isTypingInProgress(state);
    if (typeaheadOnListItem) {
        var matchItemOpts = {
            focusItemAtIndex: focusItemAtIndex,
            focusedItemIndex: focusedItemIndex,
            nextChar: ' ',
            sortedIndexByFirstChar: sortedIndexByFirstChar,
            skipFocus: false,
            isItemAtIndexDisabled: isItemAtIndexDisabled,
        };
        // space participates in typeahead matching if in rapid typing mode
        return matchItem(matchItemOpts, state);
    }
    return -1;
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
function isNumberArray(selectedIndex) {
    return selectedIndex instanceof Array;
}
var MDCListFoundation = /** @class */ (function (_super) {
    __extends(MDCListFoundation, _super);
    function MDCListFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCListFoundation.defaultAdapter), adapter)) || this;
        _this.wrapFocus_ = false;
        _this.isVertical_ = true;
        _this.isSingleSelectionList_ = false;
        _this.selectedIndex_ = numbers$7.UNSET_INDEX;
        _this.focusedItemIndex = numbers$7.UNSET_INDEX;
        _this.useActivatedClass_ = false;
        _this.ariaCurrentAttrValue_ = null;
        _this.isCheckboxList_ = false;
        _this.isRadioList_ = false;
        _this.hasTypeahead = false;
        // Transiently holds current typeahead prefix from user.
        _this.typeaheadState = initState();
        _this.sortedIndexByFirstChar = new Map();
        return _this;
    }
    Object.defineProperty(MDCListFoundation, "strings", {
        get: function () {
            return strings$l;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCListFoundation, "cssClasses", {
        get: function () {
            return cssClasses$j;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCListFoundation, "numbers", {
        get: function () {
            return numbers$7;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCListFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClassForElementIndex: function () { return undefined; },
                focusItemAtIndex: function () { return undefined; },
                getAttributeForElementIndex: function () { return null; },
                getFocusedElementIndex: function () { return 0; },
                getListItemCount: function () { return 0; },
                hasCheckboxAtIndex: function () { return false; },
                hasRadioAtIndex: function () { return false; },
                isCheckboxCheckedAtIndex: function () { return false; },
                isFocusInsideList: function () { return false; },
                isRootFocused: function () { return false; },
                listItemAtIndexHasClass: function () { return false; },
                notifyAction: function () { return undefined; },
                removeClassForElementIndex: function () { return undefined; },
                setAttributeForElementIndex: function () { return undefined; },
                setCheckedCheckboxOrRadioAtIndex: function () { return undefined; },
                setTabIndexForListItemChildren: function () { return undefined; },
                getPrimaryTextAtIndex: function () { return ''; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCListFoundation.prototype.layout = function () {
        if (this.adapter.getListItemCount() === 0) {
            return;
        }
        if (this.adapter.hasCheckboxAtIndex(0)) {
            this.isCheckboxList_ = true;
        }
        else if (this.adapter.hasRadioAtIndex(0)) {
            this.isRadioList_ = true;
        }
        if (this.hasTypeahead) {
            this.sortedIndexByFirstChar = this.typeaheadInitSortedIndex();
        }
    };
    /**
     * Sets the private wrapFocus_ variable.
     */
    MDCListFoundation.prototype.setWrapFocus = function (value) {
        this.wrapFocus_ = value;
    };
    /**
     * Sets the isVertical_ private variable.
     */
    MDCListFoundation.prototype.setVerticalOrientation = function (value) {
        this.isVertical_ = value;
    };
    /**
     * Sets the isSingleSelectionList_ private variable.
     */
    MDCListFoundation.prototype.setSingleSelection = function (value) {
        this.isSingleSelectionList_ = value;
    };
    /**
     * Sets whether typeahead is enabled on the list.
     * @param hasTypeahead Whether typeahead is enabled.
     */
    MDCListFoundation.prototype.setHasTypeahead = function (hasTypeahead) {
        this.hasTypeahead = hasTypeahead;
        if (hasTypeahead) {
            this.sortedIndexByFirstChar = this.typeaheadInitSortedIndex();
        }
    };
    /**
     * @return Whether typeahead is currently matching a user-specified prefix.
     */
    MDCListFoundation.prototype.isTypeaheadInProgress = function () {
        return this.hasTypeahead &&
            isTypingInProgress(this.typeaheadState);
    };
    /**
     * Sets the useActivatedClass_ private variable.
     */
    MDCListFoundation.prototype.setUseActivatedClass = function (useActivated) {
        this.useActivatedClass_ = useActivated;
    };
    MDCListFoundation.prototype.getSelectedIndex = function () {
        return this.selectedIndex_;
    };
    MDCListFoundation.prototype.setSelectedIndex = function (index) {
        if (!this.isIndexValid_(index)) {
            return;
        }
        if (this.isCheckboxList_) {
            this.setCheckboxAtIndex_(index);
        }
        else if (this.isRadioList_) {
            this.setRadioAtIndex_(index);
        }
        else {
            this.setSingleSelectionAtIndex_(index);
        }
    };
    /**
     * Focus in handler for the list items.
     */
    MDCListFoundation.prototype.handleFocusIn = function (_, listItemIndex) {
        if (listItemIndex >= 0) {
            this.focusedItemIndex = listItemIndex;
            this.adapter.setTabIndexForListItemChildren(listItemIndex, '0');
        }
    };
    /**
     * Focus out handler for the list items.
     */
    MDCListFoundation.prototype.handleFocusOut = function (_, listItemIndex) {
        var _this = this;
        if (listItemIndex >= 0) {
            this.adapter.setTabIndexForListItemChildren(listItemIndex, '-1');
        }
        /**
         * Between Focusout & Focusin some browsers do not have focus on any element. Setting a delay to wait till the focus
         * is moved to next element.
         */
        setTimeout(function () {
            if (!_this.adapter.isFocusInsideList()) {
                _this.setTabindexToFirstSelectedItem_();
            }
        }, 0);
    };
    /**
     * Key handler for the list.
     */
    MDCListFoundation.prototype.handleKeydown = function (event, isRootListItem, listItemIndex) {
        var _this = this;
        var isArrowLeft = normalizeKey(event) === 'ArrowLeft';
        var isArrowUp = normalizeKey(event) === 'ArrowUp';
        var isArrowRight = normalizeKey(event) === 'ArrowRight';
        var isArrowDown = normalizeKey(event) === 'ArrowDown';
        var isHome = normalizeKey(event) === 'Home';
        var isEnd = normalizeKey(event) === 'End';
        var isEnter = normalizeKey(event) === 'Enter';
        var isSpace = normalizeKey(event) === 'Spacebar';
        if (this.adapter.isRootFocused()) {
            if (isArrowUp || isEnd) {
                event.preventDefault();
                this.focusLastElement();
            }
            else if (isArrowDown || isHome) {
                event.preventDefault();
                this.focusFirstElement();
            }
            if (this.hasTypeahead) {
                var handleKeydownOpts = {
                    event: event,
                    focusItemAtIndex: function (index) {
                        _this.focusItemAtIndex(index);
                    },
                    focusedItemIndex: -1,
                    isTargetListItem: isRootListItem,
                    sortedIndexByFirstChar: this.sortedIndexByFirstChar,
                    isItemAtIndexDisabled: function (index) {
                        return _this.adapter.listItemAtIndexHasClass(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS);
                    },
                };
                handleKeydown(handleKeydownOpts, this.typeaheadState);
            }
            return;
        }
        var currentIndex = this.adapter.getFocusedElementIndex();
        if (currentIndex === -1) {
            currentIndex = listItemIndex;
            if (currentIndex < 0) {
                // If this event doesn't have a mdc-list-item ancestor from the
                // current list (not from a sublist), return early.
                return;
            }
        }
        if ((this.isVertical_ && isArrowDown) || (!this.isVertical_ && isArrowRight)) {
            preventDefaultEvent(event);
            this.focusNextElement(currentIndex);
        }
        else if ((this.isVertical_ && isArrowUp) || (!this.isVertical_ && isArrowLeft)) {
            preventDefaultEvent(event);
            this.focusPrevElement(currentIndex);
        }
        else if (isHome) {
            preventDefaultEvent(event);
            this.focusFirstElement();
        }
        else if (isEnd) {
            preventDefaultEvent(event);
            this.focusLastElement();
        }
        else if (isEnter || isSpace) {
            if (isRootListItem) {
                // Return early if enter key is pressed on anchor element which triggers synthetic MouseEvent event.
                var target = event.target;
                if (target && target.tagName === 'A' && isEnter) {
                    return;
                }
                preventDefaultEvent(event);
                if (this.adapter.listItemAtIndexHasClass(currentIndex, cssClasses$j.LIST_ITEM_DISABLED_CLASS)) {
                    return;
                }
                if (!this.isTypeaheadInProgress()) {
                    if (this.isSelectableList_()) {
                        this.setSelectedIndexOnAction_(currentIndex);
                    }
                    this.adapter.notifyAction(currentIndex);
                }
            }
        }
        if (this.hasTypeahead) {
            var handleKeydownOpts = {
                event: event,
                focusItemAtIndex: function (index) {
                    _this.focusItemAtIndex(index);
                },
                focusedItemIndex: this.focusedItemIndex,
                isTargetListItem: isRootListItem,
                sortedIndexByFirstChar: this.sortedIndexByFirstChar,
                isItemAtIndexDisabled: function (index) { return _this.adapter.listItemAtIndexHasClass(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS); },
            };
            handleKeydown(handleKeydownOpts, this.typeaheadState);
        }
    };
    /**
     * Click handler for the list.
     */
    MDCListFoundation.prototype.handleClick = function (index, toggleCheckbox) {
        if (index === numbers$7.UNSET_INDEX) {
            return;
        }
        this.setTabindexAtIndex_(index);
        this.focusedItemIndex = index;
        if (this.adapter.listItemAtIndexHasClass(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS)) {
            return;
        }
        if (this.isSelectableList_()) {
            this.setSelectedIndexOnAction_(index, toggleCheckbox);
        }
        this.adapter.notifyAction(index);
    };
    /**
     * Focuses the next element on the list.
     */
    MDCListFoundation.prototype.focusNextElement = function (index) {
        var count = this.adapter.getListItemCount();
        var nextIndex = index + 1;
        if (nextIndex >= count) {
            if (this.wrapFocus_) {
                nextIndex = 0;
            }
            else {
                // Return early because last item is already focused.
                return index;
            }
        }
        this.focusItemAtIndex(nextIndex);
        return nextIndex;
    };
    /**
     * Focuses the previous element on the list.
     */
    MDCListFoundation.prototype.focusPrevElement = function (index) {
        var prevIndex = index - 1;
        if (prevIndex < 0) {
            if (this.wrapFocus_) {
                prevIndex = this.adapter.getListItemCount() - 1;
            }
            else {
                // Return early because first item is already focused.
                return index;
            }
        }
        this.focusItemAtIndex(prevIndex);
        return prevIndex;
    };
    MDCListFoundation.prototype.focusFirstElement = function () {
        this.focusItemAtIndex(0);
        return 0;
    };
    MDCListFoundation.prototype.focusLastElement = function () {
        var lastIndex = this.adapter.getListItemCount() - 1;
        this.focusItemAtIndex(lastIndex);
        return lastIndex;
    };
    /**
     * @param itemIndex Index of the list item
     * @param isEnabled Sets the list item to enabled or disabled.
     */
    MDCListFoundation.prototype.setEnabled = function (itemIndex, isEnabled) {
        if (!this.isIndexValid_(itemIndex)) {
            return;
        }
        if (isEnabled) {
            this.adapter.removeClassForElementIndex(itemIndex, cssClasses$j.LIST_ITEM_DISABLED_CLASS);
            this.adapter.setAttributeForElementIndex(itemIndex, strings$l.ARIA_DISABLED, 'false');
        }
        else {
            this.adapter.addClassForElementIndex(itemIndex, cssClasses$j.LIST_ITEM_DISABLED_CLASS);
            this.adapter.setAttributeForElementIndex(itemIndex, strings$l.ARIA_DISABLED, 'true');
        }
    };
    MDCListFoundation.prototype.setSingleSelectionAtIndex_ = function (index) {
        if (this.selectedIndex_ === index) {
            return;
        }
        var selectedClassName = cssClasses$j.LIST_ITEM_SELECTED_CLASS;
        if (this.useActivatedClass_) {
            selectedClassName = cssClasses$j.LIST_ITEM_ACTIVATED_CLASS;
        }
        if (this.selectedIndex_ !== numbers$7.UNSET_INDEX) {
            this.adapter.removeClassForElementIndex(this.selectedIndex_, selectedClassName);
        }
        this.adapter.addClassForElementIndex(index, selectedClassName);
        this.setAriaForSingleSelectionAtIndex_(index);
        this.selectedIndex_ = index;
    };
    /**
     * Sets aria attribute for single selection at given index.
     */
    MDCListFoundation.prototype.setAriaForSingleSelectionAtIndex_ = function (index) {
        // Detect the presence of aria-current and get the value only during list initialization when it is in unset state.
        if (this.selectedIndex_ === numbers$7.UNSET_INDEX) {
            this.ariaCurrentAttrValue_ =
                this.adapter.getAttributeForElementIndex(index, strings$l.ARIA_CURRENT);
        }
        var isAriaCurrent = this.ariaCurrentAttrValue_ !== null;
        var ariaAttribute = isAriaCurrent ? strings$l.ARIA_CURRENT : strings$l.ARIA_SELECTED;
        if (this.selectedIndex_ !== numbers$7.UNSET_INDEX) {
            this.adapter.setAttributeForElementIndex(this.selectedIndex_, ariaAttribute, 'false');
        }
        var ariaAttributeValue = isAriaCurrent ? this.ariaCurrentAttrValue_ : 'true';
        this.adapter.setAttributeForElementIndex(index, ariaAttribute, ariaAttributeValue);
    };
    /**
     * Toggles radio at give index. Radio doesn't change the checked state if it is already checked.
     */
    MDCListFoundation.prototype.setRadioAtIndex_ = function (index) {
        this.adapter.setCheckedCheckboxOrRadioAtIndex(index, true);
        if (this.selectedIndex_ !== numbers$7.UNSET_INDEX) {
            this.adapter.setAttributeForElementIndex(this.selectedIndex_, strings$l.ARIA_CHECKED, 'false');
        }
        this.adapter.setAttributeForElementIndex(index, strings$l.ARIA_CHECKED, 'true');
        this.selectedIndex_ = index;
    };
    MDCListFoundation.prototype.setCheckboxAtIndex_ = function (index) {
        for (var i = 0; i < this.adapter.getListItemCount(); i++) {
            var isChecked = false;
            if (index.indexOf(i) >= 0) {
                isChecked = true;
            }
            this.adapter.setCheckedCheckboxOrRadioAtIndex(i, isChecked);
            this.adapter.setAttributeForElementIndex(i, strings$l.ARIA_CHECKED, isChecked ? 'true' : 'false');
        }
        this.selectedIndex_ = index;
    };
    MDCListFoundation.prototype.setTabindexAtIndex_ = function (index) {
        if (this.focusedItemIndex === numbers$7.UNSET_INDEX && index !== 0) {
            // If no list item was selected set first list item's tabindex to -1.
            // Generally, tabindex is set to 0 on first list item of list that has no preselected items.
            this.adapter.setAttributeForElementIndex(0, 'tabindex', '-1');
        }
        else if (this.focusedItemIndex >= 0 && this.focusedItemIndex !== index) {
            this.adapter.setAttributeForElementIndex(this.focusedItemIndex, 'tabindex', '-1');
        }
        this.adapter.setAttributeForElementIndex(index, 'tabindex', '0');
    };
    /**
     * @return Return true if it is single selectin list, checkbox list or radio list.
     */
    MDCListFoundation.prototype.isSelectableList_ = function () {
        return this.isSingleSelectionList_ || this.isCheckboxList_ || this.isRadioList_;
    };
    MDCListFoundation.prototype.setTabindexToFirstSelectedItem_ = function () {
        var targetIndex = 0;
        if (this.isSelectableList_()) {
            if (typeof this.selectedIndex_ === 'number' && this.selectedIndex_ !== numbers$7.UNSET_INDEX) {
                targetIndex = this.selectedIndex_;
            }
            else if (isNumberArray(this.selectedIndex_) && this.selectedIndex_.length > 0) {
                targetIndex = this.selectedIndex_.reduce(function (currentIndex, minIndex) { return Math.min(currentIndex, minIndex); });
            }
        }
        this.setTabindexAtIndex_(targetIndex);
    };
    MDCListFoundation.prototype.isIndexValid_ = function (index) {
        var _this = this;
        if (index instanceof Array) {
            if (!this.isCheckboxList_) {
                throw new Error('MDCListFoundation: Array of index is only supported for checkbox based list');
            }
            if (index.length === 0) {
                return true;
            }
            else {
                return index.some(function (i) { return _this.isIndexInRange_(i); });
            }
        }
        else if (typeof index === 'number') {
            if (this.isCheckboxList_) {
                throw new Error('MDCListFoundation: Expected array of index for checkbox based list but got number: ' + index);
            }
            return this.isIndexInRange_(index);
        }
        else {
            return false;
        }
    };
    MDCListFoundation.prototype.isIndexInRange_ = function (index) {
        var listSize = this.adapter.getListItemCount();
        return index >= 0 && index < listSize;
    };
    /**
     * Sets selected index on user action, toggles checkbox / radio based on toggleCheckbox value.
     * User interaction should not toggle list item(s) when disabled.
     */
    MDCListFoundation.prototype.setSelectedIndexOnAction_ = function (index, toggleCheckbox) {
        if (toggleCheckbox === void 0) { toggleCheckbox = true; }
        if (this.isCheckboxList_) {
            this.toggleCheckboxAtIndex_(index, toggleCheckbox);
        }
        else {
            this.setSelectedIndex(index);
        }
    };
    MDCListFoundation.prototype.toggleCheckboxAtIndex_ = function (index, toggleCheckbox) {
        var isChecked = this.adapter.isCheckboxCheckedAtIndex(index);
        if (toggleCheckbox) {
            isChecked = !isChecked;
            this.adapter.setCheckedCheckboxOrRadioAtIndex(index, isChecked);
        }
        this.adapter.setAttributeForElementIndex(index, strings$l.ARIA_CHECKED, isChecked ? 'true' : 'false');
        // If none of the checkbox items are selected and selectedIndex is not initialized then provide a default value.
        var selectedIndexes = this.selectedIndex_ === numbers$7.UNSET_INDEX ? [] : this.selectedIndex_.slice();
        if (isChecked) {
            selectedIndexes.push(index);
        }
        else {
            selectedIndexes = selectedIndexes.filter(function (i) { return i !== index; });
        }
        this.selectedIndex_ = selectedIndexes;
    };
    MDCListFoundation.prototype.focusItemAtIndex = function (index) {
        this.setTabindexAtIndex_(index);
        this.adapter.focusItemAtIndex(index);
        this.focusedItemIndex = index;
    };
    /**
     * Given the next desired character from the user, adds it to the typeahead
     * buffer. Then, attempts to find the next option matching the buffer. Wraps
     * around if at the end of options.
     *
     * @param nextChar The next character to add to the prefix buffer.
     * @param startingIndex The index from which to start matching. Only relevant
     *     when starting a new match sequence. To start a new match sequence,
     *     clear the buffer using `clearTypeaheadBuffer`, or wait for the buffer
     *     to clear after a set interval defined in list foundation. Defaults to
     *     the currently focused index.
     * @return The index of the matched item, or -1 if no match.
     */
    MDCListFoundation.prototype.typeaheadMatchItem = function (nextChar, startingIndex, skipFocus) {
        var _this = this;
        if (skipFocus === void 0) { skipFocus = false; }
        var opts = {
            focusItemAtIndex: function (index) {
                _this.focusItemAtIndex(index);
            },
            focusedItemIndex: startingIndex ? startingIndex : this.focusedItemIndex,
            nextChar: nextChar,
            sortedIndexByFirstChar: this.sortedIndexByFirstChar,
            skipFocus: skipFocus,
            isItemAtIndexDisabled: function (index) { return _this.adapter.listItemAtIndexHasClass(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS); }
        };
        return matchItem(opts, this.typeaheadState);
    };
    /**
     * Initializes the MDCListTextAndIndex data structure by indexing the current
     * list items by primary text.
     *
     * @return The primary texts of all the list items sorted by first character.
     */
    MDCListFoundation.prototype.typeaheadInitSortedIndex = function () {
        return initSortedIndex(this.adapter.getListItemCount(), this.adapter.getPrimaryTextAtIndex);
    };
    /**
     * Clears the typeahead buffer.
     */
    MDCListFoundation.prototype.clearTypeaheadBuffer = function () {
        clearBuffer(this.typeaheadState);
    };
    return MDCListFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCList = /** @class */ (function (_super) {
    __extends(MDCList, _super);
    function MDCList() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(MDCList.prototype, "vertical", {
        set: function (value) {
            this.foundation.setVerticalOrientation(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "listElements", {
        get: function () {
            return [].slice.call(this.root.querySelectorAll("." + cssClasses$j.LIST_ITEM_CLASS));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "wrapFocus", {
        set: function (value) {
            this.foundation.setWrapFocus(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "typeaheadInProgress", {
        /**
         * @return Whether typeahead is currently matching a user-specified prefix.
         */
        get: function () {
            return this.foundation.isTypeaheadInProgress();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "hasTypeahead", {
        /**
         * Sets whether typeahead functionality is enabled on the list.
         * @param hasTypeahead Whether typeahead is enabled.
         */
        set: function (hasTypeahead) {
            this.foundation.setHasTypeahead(hasTypeahead);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "singleSelection", {
        set: function (isSingleSelectionList) {
            this.foundation.setSingleSelection(isSingleSelectionList);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCList.prototype, "selectedIndex", {
        get: function () {
            return this.foundation.getSelectedIndex();
        },
        set: function (index) {
            this.foundation.setSelectedIndex(index);
        },
        enumerable: true,
        configurable: true
    });
    MDCList.attachTo = function (root) {
        return new MDCList(root);
    };
    MDCList.prototype.initialSyncWithDOM = function () {
        this.handleClick_ = this.handleClickEvent_.bind(this);
        this.handleKeydown_ = this.handleKeydownEvent_.bind(this);
        this.focusInEventListener_ = this.handleFocusInEvent_.bind(this);
        this.focusOutEventListener_ = this.handleFocusOutEvent_.bind(this);
        this.listen('keydown', this.handleKeydown_);
        this.listen('click', this.handleClick_);
        this.listen('focusin', this.focusInEventListener_);
        this.listen('focusout', this.focusOutEventListener_);
        this.layout();
        this.initializeListType();
    };
    MDCList.prototype.destroy = function () {
        this.unlisten('keydown', this.handleKeydown_);
        this.unlisten('click', this.handleClick_);
        this.unlisten('focusin', this.focusInEventListener_);
        this.unlisten('focusout', this.focusOutEventListener_);
    };
    MDCList.prototype.layout = function () {
        var direction = this.root.getAttribute(strings$l.ARIA_ORIENTATION);
        this.vertical = direction !== strings$l.ARIA_ORIENTATION_HORIZONTAL;
        // List items need to have at least tabindex=-1 to be focusable.
        [].slice.call(this.root.querySelectorAll('.mdc-list-item:not([tabindex])'))
            .forEach(function (el) {
            el.setAttribute('tabindex', '-1');
        });
        // Child button/a elements are not tabbable until the list item is focused.
        [].slice.call(this.root.querySelectorAll(strings$l.FOCUSABLE_CHILD_ELEMENTS))
            .forEach(function (el) { return el.setAttribute('tabindex', '-1'); });
        this.foundation.layout();
    };
    /**
     * Extracts the primary text from a list item.
     * @param item The list item element.
     * @return The primary text in the element.
     */
    MDCList.prototype.getPrimaryText = function (item) {
        var primaryText = item.querySelector("." + cssClasses$j.LIST_ITEM_PRIMARY_TEXT_CLASS);
        if (primaryText) {
            return primaryText.textContent || '';
        }
        var singleLineText = item.querySelector("." + cssClasses$j.LIST_ITEM_TEXT_CLASS);
        return (singleLineText && singleLineText.textContent) || '';
    };
    /**
     * Initialize selectedIndex value based on pre-selected checkbox list items, single selection or radio.
     */
    MDCList.prototype.initializeListType = function () {
        var _this = this;
        var checkboxListItems = this.root.querySelectorAll(strings$l.ARIA_ROLE_CHECKBOX_SELECTOR);
        var singleSelectedListItem = this.root.querySelector("\n      ." + cssClasses$j.LIST_ITEM_ACTIVATED_CLASS + ",\n      ." + cssClasses$j.LIST_ITEM_SELECTED_CLASS + "\n    ");
        var radioSelectedListItem = this.root.querySelector(strings$l.ARIA_CHECKED_RADIO_SELECTOR);
        if (checkboxListItems.length) {
            var preselectedItems = this.root.querySelectorAll(strings$l.ARIA_CHECKED_CHECKBOX_SELECTOR);
            this.selectedIndex =
                [].map.call(preselectedItems, function (listItem) { return _this.listElements.indexOf(listItem); });
        }
        else if (singleSelectedListItem) {
            if (singleSelectedListItem.classList.contains(cssClasses$j.LIST_ITEM_ACTIVATED_CLASS)) {
                this.foundation.setUseActivatedClass(true);
            }
            this.singleSelection = true;
            this.selectedIndex = this.listElements.indexOf(singleSelectedListItem);
        }
        else if (radioSelectedListItem) {
            this.selectedIndex = this.listElements.indexOf(radioSelectedListItem);
        }
    };
    /**
     * Updates the list item at itemIndex to the desired isEnabled state.
     * @param itemIndex Index of the list item
     * @param isEnabled Sets the list item to enabled or disabled.
     */
    MDCList.prototype.setEnabled = function (itemIndex, isEnabled) {
        this.foundation.setEnabled(itemIndex, isEnabled);
    };
    /**
     * Given the next desired character from the user, adds it to the typeahead
     * buffer. Then, attempts to find the next option matching the buffer. Wraps
     * around if at the end of options.
     *
     * @param nextChar The next character to add to the prefix buffer.
     * @param startingIndex The index from which to start matching. Defaults to
     *     the currently focused index.
     * @return The index of the matched item.
     */
    MDCList.prototype.typeaheadMatchItem = function (nextChar, startingIndex) {
        return this.foundation.typeaheadMatchItem(nextChar, startingIndex, /** skipFocus */ true);
    };
    MDCList.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClassForElementIndex: function (index, className) {
                var element = _this.listElements[index];
                if (element) {
                    element.classList.add(className);
                }
            },
            focusItemAtIndex: function (index) {
                var element = _this.listElements[index];
                if (element) {
                    element.focus();
                }
            },
            getAttributeForElementIndex: function (index, attr) {
                return _this.listElements[index].getAttribute(attr);
            },
            getFocusedElementIndex: function () {
                return _this.listElements.indexOf(document.activeElement);
            },
            getListItemCount: function () { return _this.listElements.length; },
            getPrimaryTextAtIndex: function (index) {
                return _this.getPrimaryText(_this.listElements[index]);
            },
            hasCheckboxAtIndex: function (index) {
                var listItem = _this.listElements[index];
                return !!listItem.querySelector(strings$l.CHECKBOX_SELECTOR);
            },
            hasRadioAtIndex: function (index) {
                var listItem = _this.listElements[index];
                return !!listItem.querySelector(strings$l.RADIO_SELECTOR);
            },
            isCheckboxCheckedAtIndex: function (index) {
                var listItem = _this.listElements[index];
                var toggleEl = listItem.querySelector(strings$l.CHECKBOX_SELECTOR);
                return toggleEl.checked;
            },
            isFocusInsideList: function () {
                return _this.root.contains(document.activeElement);
            },
            isRootFocused: function () { return document.activeElement === _this.root; },
            listItemAtIndexHasClass: function (index, className) {
                return _this.listElements[index].classList.contains(className);
            },
            notifyAction: function (index) {
                _this.emit(strings$l.ACTION_EVENT, { index: index }, /** shouldBubble */ true);
            },
            removeClassForElementIndex: function (index, className) {
                var element = _this.listElements[index];
                if (element) {
                    element.classList.remove(className);
                }
            },
            setAttributeForElementIndex: function (index, attr, value) {
                var element = _this.listElements[index];
                if (element) {
                    element.setAttribute(attr, value);
                }
            },
            setCheckedCheckboxOrRadioAtIndex: function (index, isChecked) {
                var listItem = _this.listElements[index];
                var toggleEl = listItem.querySelector(strings$l.CHECKBOX_RADIO_SELECTOR);
                toggleEl.checked = isChecked;
                var event = document.createEvent('Event');
                event.initEvent('change', true, true);
                toggleEl.dispatchEvent(event);
            },
            setTabIndexForListItemChildren: function (listItemIndex, tabIndexValue) {
                var element = _this.listElements[listItemIndex];
                var listItemChildren = [].slice.call(element.querySelectorAll(strings$l.CHILD_ELEMENTS_TO_TOGGLE_TABINDEX));
                listItemChildren.forEach(function (el) { return el.setAttribute('tabindex', tabIndexValue); });
            },
        };
        return new MDCListFoundation(adapter);
    };
    /**
     * Used to figure out which list item this event is targetting. Or returns -1 if
     * there is no list item
     */
    MDCList.prototype.getListItemIndex_ = function (evt) {
        var eventTarget = evt.target;
        var nearestParent = closest(eventTarget, "." + cssClasses$j.LIST_ITEM_CLASS + ", ." + cssClasses$j.ROOT);
        // Get the index of the element if it is a list item.
        if (nearestParent && matches(nearestParent, "." + cssClasses$j.LIST_ITEM_CLASS)) {
            return this.listElements.indexOf(nearestParent);
        }
        return -1;
    };
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    MDCList.prototype.handleFocusInEvent_ = function (evt) {
        var index = this.getListItemIndex_(evt);
        this.foundation.handleFocusIn(evt, index);
    };
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    MDCList.prototype.handleFocusOutEvent_ = function (evt) {
        var index = this.getListItemIndex_(evt);
        this.foundation.handleFocusOut(evt, index);
    };
    /**
     * Used to figure out which element was focused when keydown event occurred before sending the event to the
     * foundation.
     */
    MDCList.prototype.handleKeydownEvent_ = function (evt) {
        var index = this.getListItemIndex_(evt);
        var target = evt.target;
        this.foundation.handleKeydown(evt, target.classList.contains(cssClasses$j.LIST_ITEM_CLASS), index);
    };
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    MDCList.prototype.handleClickEvent_ = function (evt) {
        var index = this.getListItemIndex_(evt);
        var target = evt.target;
        // Toggle the checkbox only if it's not the target of the event, or the checkbox will have 2 change events.
        var toggleCheckbox = !matches(target, strings$l.CHECKBOX_RADIO_SELECTOR);
        this.foundation.handleClick(index, toggleCheckbox);
    };
    return MDCList;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$i = {
    LABEL_FLOAT_ABOVE: 'mdc-floating-label--float-above',
    LABEL_REQUIRED: 'mdc-floating-label--required',
    LABEL_SHAKE: 'mdc-floating-label--shake',
    ROOT: 'mdc-floating-label',
};

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFloatingLabelFoundation = /** @class */ (function (_super) {
    __extends(MDCFloatingLabelFoundation, _super);
    function MDCFloatingLabelFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCFloatingLabelFoundation.defaultAdapter), adapter)) || this;
        _this.shakeAnimationEndHandler_ = function () { return _this.handleShakeAnimationEnd_(); };
        return _this;
    }
    Object.defineProperty(MDCFloatingLabelFoundation, "cssClasses", {
        get: function () {
            return cssClasses$i;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFloatingLabelFoundation, "defaultAdapter", {
        /**
         * See {@link MDCFloatingLabelAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                getWidth: function () { return 0; },
                registerInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCFloatingLabelFoundation.prototype.init = function () {
        this.adapter.registerInteractionHandler('animationend', this.shakeAnimationEndHandler_);
    };
    MDCFloatingLabelFoundation.prototype.destroy = function () {
        this.adapter.deregisterInteractionHandler('animationend', this.shakeAnimationEndHandler_);
    };
    /**
     * Returns the width of the label element.
     */
    MDCFloatingLabelFoundation.prototype.getWidth = function () {
        return this.adapter.getWidth();
    };
    /**
     * Styles the label to produce a shake animation to indicate an error.
     * @param shouldShake If true, adds the shake CSS class; otherwise, removes shake class.
     */
    MDCFloatingLabelFoundation.prototype.shake = function (shouldShake) {
        var LABEL_SHAKE = MDCFloatingLabelFoundation.cssClasses.LABEL_SHAKE;
        if (shouldShake) {
            this.adapter.addClass(LABEL_SHAKE);
        }
        else {
            this.adapter.removeClass(LABEL_SHAKE);
        }
    };
    /**
     * Styles the label to float or dock.
     * @param shouldFloat If true, adds the float CSS class; otherwise, removes float and shake classes to dock the label.
     */
    MDCFloatingLabelFoundation.prototype.float = function (shouldFloat) {
        var _a = MDCFloatingLabelFoundation.cssClasses, LABEL_FLOAT_ABOVE = _a.LABEL_FLOAT_ABOVE, LABEL_SHAKE = _a.LABEL_SHAKE;
        if (shouldFloat) {
            this.adapter.addClass(LABEL_FLOAT_ABOVE);
        }
        else {
            this.adapter.removeClass(LABEL_FLOAT_ABOVE);
            this.adapter.removeClass(LABEL_SHAKE);
        }
    };
    /**
     * Styles the label as required.
     * @param isRequired If true, adds an asterisk to the label, indicating that it is required.
     */
    MDCFloatingLabelFoundation.prototype.setRequired = function (isRequired) {
        var LABEL_REQUIRED = MDCFloatingLabelFoundation.cssClasses.LABEL_REQUIRED;
        if (isRequired) {
            this.adapter.addClass(LABEL_REQUIRED);
        }
        else {
            this.adapter.removeClass(LABEL_REQUIRED);
        }
    };
    MDCFloatingLabelFoundation.prototype.handleShakeAnimationEnd_ = function () {
        var LABEL_SHAKE = MDCFloatingLabelFoundation.cssClasses.LABEL_SHAKE;
        this.adapter.removeClass(LABEL_SHAKE);
    };
    return MDCFloatingLabelFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFloatingLabel = /** @class */ (function (_super) {
    __extends(MDCFloatingLabel, _super);
    function MDCFloatingLabel() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCFloatingLabel.attachTo = function (root) {
        return new MDCFloatingLabel(root);
    };
    /**
     * Styles the label to produce the label shake for errors.
     * @param shouldShake If true, shakes the label by adding a CSS class; otherwise, stops shaking by removing the class.
     */
    MDCFloatingLabel.prototype.shake = function (shouldShake) {
        this.foundation.shake(shouldShake);
    };
    /**
     * Styles the label to float/dock.
     * @param shouldFloat If true, floats the label by adding a CSS class; otherwise, docks it by removing the class.
     */
    MDCFloatingLabel.prototype.float = function (shouldFloat) {
        this.foundation.float(shouldFloat);
    };
    /**
     * Styles the label as required.
     * @param isRequired If true, adds an asterisk to the label, indicating that it is required.
     */
    MDCFloatingLabel.prototype.setRequired = function (isRequired) {
        this.foundation.setRequired(isRequired);
    };
    MDCFloatingLabel.prototype.getWidth = function () {
        return this.foundation.getWidth();
    };
    MDCFloatingLabel.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            getWidth: function () { return estimateScrollWidth(_this.root); },
            registerInteractionHandler: function (evtType, handler) {
                return _this.listen(evtType, handler);
            },
            deregisterInteractionHandler: function (evtType, handler) {
                return _this.unlisten(evtType, handler);
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCFloatingLabelFoundation(adapter);
    };
    return MDCFloatingLabel;
}(MDCComponent));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$h = {
    ROOT: 'mdc-form-field',
};
var strings$k = {
    LABEL_SELECTOR: '.mdc-form-field > label',
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFormFieldFoundation = /** @class */ (function (_super) {
    __extends(MDCFormFieldFoundation, _super);
    function MDCFormFieldFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCFormFieldFoundation.defaultAdapter), adapter)) || this;
        _this.click = function () {
            _this.handleClick();
        };
        return _this;
    }
    Object.defineProperty(MDCFormFieldFoundation, "cssClasses", {
        get: function () {
            return cssClasses$h;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFormFieldFoundation, "strings", {
        get: function () {
            return strings$k;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCFormFieldFoundation, "defaultAdapter", {
        get: function () {
            return {
                activateInputRipple: function () { return undefined; },
                deactivateInputRipple: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                registerInteractionHandler: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCFormFieldFoundation.prototype.init = function () {
        this.adapter.registerInteractionHandler('click', this.click);
    };
    MDCFormFieldFoundation.prototype.destroy = function () {
        this.adapter.deregisterInteractionHandler('click', this.click);
    };
    MDCFormFieldFoundation.prototype.handleClick = function () {
        var _this = this;
        this.adapter.activateInputRipple();
        requestAnimationFrame(function () {
            _this.adapter.deactivateInputRipple();
        });
    };
    return MDCFormFieldFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCFormField = /** @class */ (function (_super) {
    __extends(MDCFormField, _super);
    function MDCFormField() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCFormField.attachTo = function (root) {
        return new MDCFormField(root);
    };
    MDCFormField.prototype.labelEl = function () {
        var LABEL_SELECTOR = MDCFormFieldFoundation.strings.LABEL_SELECTOR;
        return this.root.querySelector(LABEL_SELECTOR);
    };
    MDCFormField.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            activateInputRipple: function () {
                if (_this.input && _this.input.ripple) {
                    _this.input.ripple.activate();
                }
            },
            deactivateInputRipple: function () {
                if (_this.input && _this.input.ripple) {
                    _this.input.ripple.deactivate();
                }
            },
            deregisterInteractionHandler: function (evtType, handler) {
                var labelEl = _this.labelEl();
                if (labelEl) {
                    labelEl.removeEventListener(evtType, handler);
                }
            },
            registerInteractionHandler: function (evtType, handler) {
                var labelEl = _this.labelEl();
                if (labelEl) {
                    labelEl.addEventListener(evtType, handler);
                }
            },
        };
        return new MDCFormFieldFoundation(adapter);
    };
    return MDCFormField;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$g = {
    ICON_BUTTON_ON: 'mdc-icon-button--on',
    ROOT: 'mdc-icon-button',
};
var strings$j = {
    ARIA_LABEL: 'aria-label',
    ARIA_PRESSED: 'aria-pressed',
    DATA_ARIA_LABEL_OFF: 'data-aria-label-off',
    DATA_ARIA_LABEL_ON: 'data-aria-label-on',
    CHANGE_EVENT: 'MDCIconButtonToggle:change',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCIconButtonToggleFoundation = /** @class */ (function (_super) {
    __extends(MDCIconButtonToggleFoundation, _super);
    function MDCIconButtonToggleFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCIconButtonToggleFoundation.defaultAdapter), adapter)) || this;
        /**
         * Whether the icon button has an aria label that changes depending on
         * toggled state.
         */
        _this.hasToggledAriaLabel = false;
        return _this;
    }
    Object.defineProperty(MDCIconButtonToggleFoundation, "cssClasses", {
        get: function () {
            return cssClasses$g;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCIconButtonToggleFoundation, "strings", {
        get: function () {
            return strings$j;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCIconButtonToggleFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                hasClass: function () { return false; },
                notifyChange: function () { return undefined; },
                removeClass: function () { return undefined; },
                getAttr: function () { return null; },
                setAttr: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCIconButtonToggleFoundation.prototype.init = function () {
        var ariaLabelOn = this.adapter.getAttr(strings$j.DATA_ARIA_LABEL_ON);
        var ariaLabelOff = this.adapter.getAttr(strings$j.DATA_ARIA_LABEL_OFF);
        if (ariaLabelOn && ariaLabelOff) {
            if (this.adapter.getAttr(strings$j.ARIA_PRESSED) !== null) {
                throw new Error('MDCIconButtonToggleFoundation: Button should not set ' +
                    '`aria-pressed` if it has a toggled aria label.');
            }
            this.hasToggledAriaLabel = true;
        }
        else {
            this.adapter.setAttr(strings$j.ARIA_PRESSED, String(this.isOn()));
        }
    };
    MDCIconButtonToggleFoundation.prototype.handleClick = function () {
        this.toggle();
        this.adapter.notifyChange({ isOn: this.isOn() });
    };
    MDCIconButtonToggleFoundation.prototype.isOn = function () {
        return this.adapter.hasClass(cssClasses$g.ICON_BUTTON_ON);
    };
    MDCIconButtonToggleFoundation.prototype.toggle = function (isOn) {
        if (isOn === void 0) { isOn = !this.isOn(); }
        // Toggle UI based on state.
        if (isOn) {
            this.adapter.addClass(cssClasses$g.ICON_BUTTON_ON);
        }
        else {
            this.adapter.removeClass(cssClasses$g.ICON_BUTTON_ON);
        }
        // Toggle aria attributes based on state.
        if (this.hasToggledAriaLabel) {
            var ariaLabel = isOn ?
                this.adapter.getAttr(strings$j.DATA_ARIA_LABEL_ON) :
                this.adapter.getAttr(strings$j.DATA_ARIA_LABEL_OFF);
            this.adapter.setAttr(strings$j.ARIA_LABEL, ariaLabel || '');
        }
        else {
            this.adapter.setAttr(strings$j.ARIA_PRESSED, "" + isOn);
        }
    };
    return MDCIconButtonToggleFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$i = MDCIconButtonToggleFoundation.strings;
var MDCIconButtonToggle = /** @class */ (function (_super) {
    __extends(MDCIconButtonToggle, _super);
    function MDCIconButtonToggle() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.rippleComponent = _this.createRipple();
        return _this;
    }
    MDCIconButtonToggle.attachTo = function (root) {
        return new MDCIconButtonToggle(root);
    };
    MDCIconButtonToggle.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleClick = function () {
            _this.foundation.handleClick();
        };
        this.listen('click', this.handleClick);
    };
    MDCIconButtonToggle.prototype.destroy = function () {
        this.unlisten('click', this.handleClick);
        this.ripple.destroy();
        _super.prototype.destroy.call(this);
    };
    MDCIconButtonToggle.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            notifyChange: function (evtData) {
                _this.emit(strings$i.CHANGE_EVENT, evtData);
            },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            getAttr: function (attrName) { return _this.root.getAttribute(attrName); },
            setAttr: function (attrName, attrValue) {
                return _this.root.setAttribute(attrName, attrValue);
            },
        };
        return new MDCIconButtonToggleFoundation(adapter);
    };
    Object.defineProperty(MDCIconButtonToggle.prototype, "ripple", {
        get: function () {
            return this.rippleComponent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCIconButtonToggle.prototype, "on", {
        get: function () {
            return this.foundation.isOn();
        },
        set: function (isOn) {
            this.foundation.toggle(isOn);
        },
        enumerable: true,
        configurable: true
    });
    MDCIconButtonToggle.prototype.createRipple = function () {
        var ripple = new MDCRipple(this.root);
        ripple.unbounded = true;
        return ripple;
    };
    return MDCIconButtonToggle;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$f = {
    LINE_RIPPLE_ACTIVE: 'mdc-line-ripple--active',
    LINE_RIPPLE_DEACTIVATING: 'mdc-line-ripple--deactivating',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCLineRippleFoundation = /** @class */ (function (_super) {
    __extends(MDCLineRippleFoundation, _super);
    function MDCLineRippleFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCLineRippleFoundation.defaultAdapter), adapter)) || this;
        _this.transitionEndHandler_ = function (evt) { return _this.handleTransitionEnd(evt); };
        return _this;
    }
    Object.defineProperty(MDCLineRippleFoundation, "cssClasses", {
        get: function () {
            return cssClasses$f;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLineRippleFoundation, "defaultAdapter", {
        /**
         * See {@link MDCLineRippleAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                setStyle: function () { return undefined; },
                registerEventHandler: function () { return undefined; },
                deregisterEventHandler: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCLineRippleFoundation.prototype.init = function () {
        this.adapter.registerEventHandler('transitionend', this.transitionEndHandler_);
    };
    MDCLineRippleFoundation.prototype.destroy = function () {
        this.adapter.deregisterEventHandler('transitionend', this.transitionEndHandler_);
    };
    MDCLineRippleFoundation.prototype.activate = function () {
        this.adapter.removeClass(cssClasses$f.LINE_RIPPLE_DEACTIVATING);
        this.adapter.addClass(cssClasses$f.LINE_RIPPLE_ACTIVE);
    };
    MDCLineRippleFoundation.prototype.setRippleCenter = function (xCoordinate) {
        this.adapter.setStyle('transform-origin', xCoordinate + "px center");
    };
    MDCLineRippleFoundation.prototype.deactivate = function () {
        this.adapter.addClass(cssClasses$f.LINE_RIPPLE_DEACTIVATING);
    };
    MDCLineRippleFoundation.prototype.handleTransitionEnd = function (evt) {
        // Wait for the line ripple to be either transparent or opaque
        // before emitting the animation end event
        var isDeactivating = this.adapter.hasClass(cssClasses$f.LINE_RIPPLE_DEACTIVATING);
        if (evt.propertyName === 'opacity') {
            if (isDeactivating) {
                this.adapter.removeClass(cssClasses$f.LINE_RIPPLE_ACTIVE);
                this.adapter.removeClass(cssClasses$f.LINE_RIPPLE_DEACTIVATING);
            }
        }
    };
    return MDCLineRippleFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCLineRipple = /** @class */ (function (_super) {
    __extends(MDCLineRipple, _super);
    function MDCLineRipple() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCLineRipple.attachTo = function (root) {
        return new MDCLineRipple(root);
    };
    /**
     * Activates the line ripple
     */
    MDCLineRipple.prototype.activate = function () {
        this.foundation.activate();
    };
    /**
     * Deactivates the line ripple
     */
    MDCLineRipple.prototype.deactivate = function () {
        this.foundation.deactivate();
    };
    /**
     * Sets the transform origin given a user's click location.
     * The `rippleCenter` is the x-coordinate of the middle of the ripple.
     */
    MDCLineRipple.prototype.setRippleCenter = function (xCoordinate) {
        this.foundation.setRippleCenter(xCoordinate);
    };
    MDCLineRipple.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            setStyle: function (propertyName, value) { return _this.root.style.setProperty(propertyName, value); },
            registerEventHandler: function (evtType, handler) { return _this.listen(evtType, handler); },
            deregisterEventHandler: function (evtType, handler) { return _this.unlisten(evtType, handler); },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCLineRippleFoundation(adapter);
    };
    return MDCLineRipple;
}(MDCComponent));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$e = {
    CLOSED_CLASS: 'mdc-linear-progress--closed',
    INDETERMINATE_CLASS: 'mdc-linear-progress--indeterminate',
    REVERSED_CLASS: 'mdc-linear-progress--reversed',
};
var strings$h = {
    ARIA_VALUENOW: 'aria-valuenow',
    BUFFER_BAR_SELECTOR: '.mdc-linear-progress__buffer-bar',
    FLEX_BASIS: 'flex-basis',
    PRIMARY_BAR_SELECTOR: '.mdc-linear-progress__primary-bar',
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCLinearProgressFoundation = /** @class */ (function (_super) {
    __extends(MDCLinearProgressFoundation, _super);
    function MDCLinearProgressFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCLinearProgressFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCLinearProgressFoundation, "cssClasses", {
        get: function () {
            return cssClasses$e;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLinearProgressFoundation, "strings", {
        get: function () {
            return strings$h;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLinearProgressFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                forceLayout: function () { return undefined; },
                setBufferBarStyle: function () { return null; },
                setPrimaryBarStyle: function () { return null; },
                hasClass: function () { return false; },
                removeAttribute: function () { return undefined; },
                removeClass: function () { return undefined; },
                setAttribute: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCLinearProgressFoundation.prototype.init = function () {
        this.isDeterminate = !this.adapter.hasClass(cssClasses$e.INDETERMINATE_CLASS);
        this.isReversed = this.adapter.hasClass(cssClasses$e.REVERSED_CLASS);
        this.progress = 0;
        this.buffer = 1;
    };
    MDCLinearProgressFoundation.prototype.setDeterminate = function (isDeterminate) {
        this.isDeterminate = isDeterminate;
        if (this.isDeterminate) {
            this.adapter.removeClass(cssClasses$e.INDETERMINATE_CLASS);
            this.adapter.setAttribute(strings$h.ARIA_VALUENOW, this.progress.toString());
            this.setPrimaryBarProgress(this.progress);
            this.setBufferBarProgress(this.buffer);
            return;
        }
        if (this.isReversed) {
            // Adding/removing REVERSED_CLASS starts a translate animation, while
            // adding INDETERMINATE_CLASS starts a scale animation. Here, we reset
            // the translate animation in order to keep it in sync with the new
            // scale animation that will start from adding INDETERMINATE_CLASS
            // below.
            this.adapter.removeClass(cssClasses$e.REVERSED_CLASS);
            this.adapter.forceLayout();
            this.adapter.addClass(cssClasses$e.REVERSED_CLASS);
        }
        this.adapter.addClass(cssClasses$e.INDETERMINATE_CLASS);
        this.adapter.removeAttribute(strings$h.ARIA_VALUENOW);
        this.setPrimaryBarProgress(1);
        this.setBufferBarProgress(1);
    };
    MDCLinearProgressFoundation.prototype.getDeterminate = function () {
        return this.isDeterminate;
    };
    MDCLinearProgressFoundation.prototype.setProgress = function (value) {
        this.progress = value;
        if (this.isDeterminate) {
            this.setPrimaryBarProgress(value);
            this.adapter.setAttribute(strings$h.ARIA_VALUENOW, value.toString());
        }
    };
    MDCLinearProgressFoundation.prototype.getProgress = function () {
        return this.progress;
    };
    MDCLinearProgressFoundation.prototype.setBuffer = function (value) {
        this.buffer = value;
        if (this.isDeterminate) {
            this.setBufferBarProgress(value);
        }
    };
    MDCLinearProgressFoundation.prototype.setReverse = function (isReversed) {
        this.isReversed = isReversed;
        if (!this.isDeterminate) {
            // Adding INDETERMINATE_CLASS starts a scale animation, while
            // adding/removing REVERSED_CLASS starts a translate animation. Here, we
            // reset the scale animation in order to keep it in sync with the new
            // translate animation that will start from adding/removing REVERSED_CLASS
            // below.
            this.adapter.removeClass(cssClasses$e.INDETERMINATE_CLASS);
            this.adapter.forceLayout();
            this.adapter.addClass(cssClasses$e.INDETERMINATE_CLASS);
        }
        if (this.isReversed) {
            this.adapter.addClass(cssClasses$e.REVERSED_CLASS);
            return;
        }
        this.adapter.removeClass(cssClasses$e.REVERSED_CLASS);
    };
    MDCLinearProgressFoundation.prototype.open = function () {
        this.adapter.removeClass(cssClasses$e.CLOSED_CLASS);
    };
    MDCLinearProgressFoundation.prototype.close = function () {
        this.adapter.addClass(cssClasses$e.CLOSED_CLASS);
    };
    MDCLinearProgressFoundation.prototype.setPrimaryBarProgress = function (progressValue) {
        var value = "scaleX(" + progressValue + ")";
        // Accessing `window` without a `typeof` check will throw on Node environments.
        var transformProp = typeof window !== 'undefined' ?
            getCorrectPropertyName(window, 'transform') : 'transform';
        this.adapter.setPrimaryBarStyle(transformProp, value);
    };
    MDCLinearProgressFoundation.prototype.setBufferBarProgress = function (progressValue) {
        var value = progressValue * 100 + "%";
        this.adapter.setBufferBarStyle(strings$h.FLEX_BASIS, value);
    };
    return MDCLinearProgressFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCLinearProgress = /** @class */ (function (_super) {
    __extends(MDCLinearProgress, _super);
    function MDCLinearProgress() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCLinearProgress.attachTo = function (root) {
        return new MDCLinearProgress(root);
    };
    Object.defineProperty(MDCLinearProgress.prototype, "determinate", {
        set: function (value) {
            this.foundation.setDeterminate(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLinearProgress.prototype, "progress", {
        set: function (value) {
            this.foundation.setProgress(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLinearProgress.prototype, "buffer", {
        set: function (value) {
            this.foundation.setBuffer(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCLinearProgress.prototype, "reverse", {
        set: function (value) {
            this.foundation.setReverse(value);
        },
        enumerable: true,
        configurable: true
    });
    MDCLinearProgress.prototype.open = function () {
        this.foundation.open();
    };
    MDCLinearProgress.prototype.close = function () {
        this.foundation.close();
    };
    MDCLinearProgress.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClass: function (className) {
                _this.root.classList.add(className);
            },
            forceLayout: function () {
                _this.root.getBoundingClientRect();
            },
            setBufferBarStyle: function (styleProperty, value) {
                var bufferBar = _this.root.querySelector(MDCLinearProgressFoundation.strings.BUFFER_BAR_SELECTOR);
                if (bufferBar) {
                    bufferBar.style.setProperty(styleProperty, value);
                }
            },
            setPrimaryBarStyle: function (styleProperty, value) {
                var primaryBar = _this.root.querySelector(MDCLinearProgressFoundation.strings.PRIMARY_BAR_SELECTOR);
                if (primaryBar) {
                    primaryBar.style.setProperty(styleProperty, value);
                }
            },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            removeAttribute: function (attributeName) {
                _this.root.removeAttribute(attributeName);
            },
            removeClass: function (className) {
                _this.root.classList.remove(className);
            },
            setAttribute: function (attributeName, value) {
                _this.root.setAttribute(attributeName, value);
            },
        };
        return new MDCLinearProgressFoundation(adapter);
    };
    return MDCLinearProgress;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cachedCssTransformPropertyName_;
/**
 * Returns the name of the correct transform property to use on the current browser.
 */
function getTransformPropertyName(globalObj, forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    if (cachedCssTransformPropertyName_ === undefined || forceRefresh) {
        var el = globalObj.document.createElement('div');
        cachedCssTransformPropertyName_ = 'transform' in el.style ? 'transform' : 'webkitTransform';
    }
    return cachedCssTransformPropertyName_;
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$d = {
    ANCHOR: 'mdc-menu-surface--anchor',
    ANIMATING_CLOSED: 'mdc-menu-surface--animating-closed',
    ANIMATING_OPEN: 'mdc-menu-surface--animating-open',
    FIXED: 'mdc-menu-surface--fixed',
    IS_OPEN_BELOW: 'mdc-menu-surface--is-open-below',
    OPEN: 'mdc-menu-surface--open',
    ROOT: 'mdc-menu-surface',
};
// tslint:disable:object-literal-sort-keys
var strings$g = {
    CLOSED_EVENT: 'MDCMenuSurface:closed',
    OPENED_EVENT: 'MDCMenuSurface:opened',
    FOCUSABLE_ELEMENTS: [
        'button:not(:disabled)', '[href]:not([aria-disabled="true"])', 'input:not(:disabled)',
        'select:not(:disabled)', 'textarea:not(:disabled)', '[tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
    ].join(', '),
};
// tslint:enable:object-literal-sort-keys
var numbers$6 = {
    /** Total duration of menu-surface open animation. */
    TRANSITION_OPEN_DURATION: 120,
    /** Total duration of menu-surface close animation. */
    TRANSITION_CLOSE_DURATION: 75,
    /** Margin left to the edge of the viewport when menu-surface is at maximum possible height. Also used as a viewport margin. */
    MARGIN_TO_EDGE: 32,
    /** Ratio of anchor width to menu-surface width for switching from corner positioning to center positioning. */
    ANCHOR_TO_MENU_SURFACE_WIDTH_RATIO: 0.67,
};
/**
 * Enum for bits in the {@see Corner) bitmap.
 */
var CornerBit;
(function (CornerBit) {
    CornerBit[CornerBit["BOTTOM"] = 1] = "BOTTOM";
    CornerBit[CornerBit["CENTER"] = 2] = "CENTER";
    CornerBit[CornerBit["RIGHT"] = 4] = "RIGHT";
    CornerBit[CornerBit["FLIP_RTL"] = 8] = "FLIP_RTL";
})(CornerBit || (CornerBit = {}));
/**
 * Enum for representing an element corner for positioning the menu-surface.
 *
 * The START constants map to LEFT if element directionality is left
 * to right and RIGHT if the directionality is right to left.
 * Likewise END maps to RIGHT or LEFT depending on the directionality.
 */
var Corner;
(function (Corner) {
    Corner[Corner["TOP_LEFT"] = 0] = "TOP_LEFT";
    Corner[Corner["TOP_RIGHT"] = 4] = "TOP_RIGHT";
    Corner[Corner["BOTTOM_LEFT"] = 1] = "BOTTOM_LEFT";
    Corner[Corner["BOTTOM_RIGHT"] = 5] = "BOTTOM_RIGHT";
    Corner[Corner["TOP_START"] = 8] = "TOP_START";
    Corner[Corner["TOP_END"] = 12] = "TOP_END";
    Corner[Corner["BOTTOM_START"] = 9] = "BOTTOM_START";
    Corner[Corner["BOTTOM_END"] = 13] = "BOTTOM_END";
})(Corner || (Corner = {}));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCMenuSurfaceFoundation = /** @class */ (function (_super) {
    __extends(MDCMenuSurfaceFoundation, _super);
    function MDCMenuSurfaceFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCMenuSurfaceFoundation.defaultAdapter), adapter)) || this;
        _this.isSurfaceOpen = false;
        _this.isQuickOpen = false;
        _this.isHoistedElement = false;
        _this.isFixedPosition = false;
        _this.openAnimationEndTimerId = 0;
        _this.closeAnimationEndTimerId = 0;
        _this.animationRequestId = 0;
        _this.anchorCorner = Corner.TOP_START;
        /**
         * Corner of the menu surface to which menu surface is attached to anchor.
         *
         *  Anchor corner --->+----------+
         *                    |  ANCHOR  |
         *                    +----------+
         *  Origin corner --->+--------------+
         *                    |              |
         *                    |              |
         *                    | MENU SURFACE |
         *                    |              |
         *                    |              |
         *                    +--------------+
         */
        _this.originCorner = Corner.TOP_START;
        _this.anchorMargin = { top: 0, right: 0, bottom: 0, left: 0 };
        _this.position = { x: 0, y: 0 };
        return _this;
    }
    Object.defineProperty(MDCMenuSurfaceFoundation, "cssClasses", {
        get: function () {
            return cssClasses$d;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuSurfaceFoundation, "strings", {
        get: function () {
            return strings$g;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuSurfaceFoundation, "numbers", {
        get: function () {
            return numbers$6;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuSurfaceFoundation, "Corner", {
        get: function () {
            return Corner;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuSurfaceFoundation, "defaultAdapter", {
        /**
         * @see {@link MDCMenuSurfaceAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                hasAnchor: function () { return false; },
                isElementInContainer: function () { return false; },
                isFocused: function () { return false; },
                isRtl: function () { return false; },
                getInnerDimensions: function () { return ({ height: 0, width: 0 }); },
                getAnchorDimensions: function () { return null; },
                getWindowDimensions: function () { return ({ height: 0, width: 0 }); },
                getBodyDimensions: function () { return ({ height: 0, width: 0 }); },
                getWindowScroll: function () { return ({ x: 0, y: 0 }); },
                setPosition: function () { return undefined; },
                setMaxHeight: function () { return undefined; },
                setTransformOrigin: function () { return undefined; },
                saveFocus: function () { return undefined; },
                restoreFocus: function () { return undefined; },
                notifyClose: function () { return undefined; },
                notifyOpen: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCMenuSurfaceFoundation.prototype.init = function () {
        var _a = MDCMenuSurfaceFoundation.cssClasses, ROOT = _a.ROOT, OPEN = _a.OPEN;
        if (!this.adapter.hasClass(ROOT)) {
            throw new Error(ROOT + " class required in root element.");
        }
        if (this.adapter.hasClass(OPEN)) {
            this.isSurfaceOpen = true;
        }
    };
    MDCMenuSurfaceFoundation.prototype.destroy = function () {
        clearTimeout(this.openAnimationEndTimerId);
        clearTimeout(this.closeAnimationEndTimerId);
        // Cancel any currently running animations.
        cancelAnimationFrame(this.animationRequestId);
    };
    /**
     * @param corner Default anchor corner alignment of top-left menu surface corner.
     */
    MDCMenuSurfaceFoundation.prototype.setAnchorCorner = function (corner) {
        this.anchorCorner = corner;
    };
    /**
     * Flip menu corner horizontally.
     */
    MDCMenuSurfaceFoundation.prototype.flipCornerHorizontally = function () {
        this.originCorner = this.originCorner ^ CornerBit.RIGHT;
    };
    /**
     * @param margin Set of margin values from anchor.
     */
    MDCMenuSurfaceFoundation.prototype.setAnchorMargin = function (margin) {
        this.anchorMargin.top = margin.top || 0;
        this.anchorMargin.right = margin.right || 0;
        this.anchorMargin.bottom = margin.bottom || 0;
        this.anchorMargin.left = margin.left || 0;
    };
    /** Used to indicate if the menu-surface is hoisted to the body. */
    MDCMenuSurfaceFoundation.prototype.setIsHoisted = function (isHoisted) {
        this.isHoistedElement = isHoisted;
    };
    /** Used to set the menu-surface calculations based on a fixed position menu. */
    MDCMenuSurfaceFoundation.prototype.setFixedPosition = function (isFixedPosition) {
        this.isFixedPosition = isFixedPosition;
    };
    /** Sets the menu-surface position on the page. */
    MDCMenuSurfaceFoundation.prototype.setAbsolutePosition = function (x, y) {
        this.position.x = this.isFinite(x) ? x : 0;
        this.position.y = this.isFinite(y) ? y : 0;
    };
    MDCMenuSurfaceFoundation.prototype.setQuickOpen = function (quickOpen) {
        this.isQuickOpen = quickOpen;
    };
    MDCMenuSurfaceFoundation.prototype.isOpen = function () {
        return this.isSurfaceOpen;
    };
    /**
     * Open the menu surface.
     */
    MDCMenuSurfaceFoundation.prototype.open = function () {
        var _this = this;
        if (this.isSurfaceOpen) {
            return;
        }
        this.adapter.saveFocus();
        if (this.isQuickOpen) {
            this.isSurfaceOpen = true;
            this.adapter.addClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
            this.dimensions = this.adapter.getInnerDimensions();
            this.autoposition();
            this.adapter.notifyOpen();
        }
        else {
            this.adapter.addClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_OPEN);
            this.animationRequestId = requestAnimationFrame(function () {
                _this.adapter.addClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
                _this.dimensions = _this.adapter.getInnerDimensions();
                _this.autoposition();
                _this.openAnimationEndTimerId = setTimeout(function () {
                    _this.openAnimationEndTimerId = 0;
                    _this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_OPEN);
                    _this.adapter.notifyOpen();
                }, numbers$6.TRANSITION_OPEN_DURATION);
            });
            this.isSurfaceOpen = true;
        }
    };
    /**
     * Closes the menu surface.
     */
    MDCMenuSurfaceFoundation.prototype.close = function (skipRestoreFocus) {
        var _this = this;
        if (skipRestoreFocus === void 0) { skipRestoreFocus = false; }
        if (!this.isSurfaceOpen) {
            return;
        }
        if (this.isQuickOpen) {
            this.isSurfaceOpen = false;
            if (!skipRestoreFocus) {
                this.maybeRestoreFocus();
            }
            this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
            this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.IS_OPEN_BELOW);
            this.adapter.notifyClose();
        }
        else {
            this.adapter.addClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_CLOSED);
            requestAnimationFrame(function () {
                _this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.OPEN);
                _this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.IS_OPEN_BELOW);
                _this.closeAnimationEndTimerId = setTimeout(function () {
                    _this.closeAnimationEndTimerId = 0;
                    _this.adapter.removeClass(MDCMenuSurfaceFoundation.cssClasses.ANIMATING_CLOSED);
                    _this.adapter.notifyClose();
                }, numbers$6.TRANSITION_CLOSE_DURATION);
            });
            this.isSurfaceOpen = false;
            if (!skipRestoreFocus) {
                this.maybeRestoreFocus();
            }
        }
    };
    /** Handle clicks and close if not within menu-surface element. */
    MDCMenuSurfaceFoundation.prototype.handleBodyClick = function (evt) {
        var el = evt.target;
        if (this.adapter.isElementInContainer(el)) {
            return;
        }
        this.close();
    };
    /** Handle keys that close the surface. */
    MDCMenuSurfaceFoundation.prototype.handleKeydown = function (evt) {
        var keyCode = evt.keyCode, key = evt.key;
        var isEscape = key === 'Escape' || keyCode === 27;
        if (isEscape) {
            this.close();
        }
    };
    MDCMenuSurfaceFoundation.prototype.autoposition = function () {
        var _a;
        // Compute measurements for autoposition methods reuse.
        this.measurements = this.getAutoLayoutmeasurements();
        var corner = this.getoriginCorner();
        var maxMenuSurfaceHeight = this.getMenuSurfaceMaxHeight(corner);
        var verticalAlignment = this.hasBit(corner, CornerBit.BOTTOM) ? 'bottom' : 'top';
        var horizontalAlignment = this.hasBit(corner, CornerBit.RIGHT) ? 'right' : 'left';
        var horizontalOffset = this.getHorizontalOriginOffset(corner);
        var verticalOffset = this.getVerticalOriginOffset(corner);
        var _b = this.measurements, anchorSize = _b.anchorSize, surfaceSize = _b.surfaceSize;
        var position = (_a = {},
            _a[horizontalAlignment] = horizontalOffset,
            _a[verticalAlignment] = verticalOffset,
            _a);
        // Center align when anchor width is comparable or greater than menu surface, otherwise keep corner.
        if (anchorSize.width / surfaceSize.width > numbers$6.ANCHOR_TO_MENU_SURFACE_WIDTH_RATIO) {
            horizontalAlignment = 'center';
        }
        // If the menu-surface has been hoisted to the body, it's no longer relative to the anchor element
        if (this.isHoistedElement || this.isFixedPosition) {
            this.adjustPositionForHoistedElement(position);
        }
        this.adapter.setTransformOrigin(horizontalAlignment + " " + verticalAlignment);
        this.adapter.setPosition(position);
        this.adapter.setMaxHeight(maxMenuSurfaceHeight ? maxMenuSurfaceHeight + 'px' : '');
        // If it is opened from the top then add is-open-below class
        if (!this.hasBit(corner, CornerBit.BOTTOM)) {
            this.adapter.addClass(MDCMenuSurfaceFoundation.cssClasses.IS_OPEN_BELOW);
        }
    };
    /**
     * @return Measurements used to position menu surface popup.
     */
    MDCMenuSurfaceFoundation.prototype.getAutoLayoutmeasurements = function () {
        var anchorRect = this.adapter.getAnchorDimensions();
        var bodySize = this.adapter.getBodyDimensions();
        var viewportSize = this.adapter.getWindowDimensions();
        var windowScroll = this.adapter.getWindowScroll();
        if (!anchorRect) {
            // tslint:disable:object-literal-sort-keys Positional properties are more readable when they're grouped together
            anchorRect = {
                top: this.position.y,
                right: this.position.x,
                bottom: this.position.y,
                left: this.position.x,
                width: 0,
                height: 0,
            };
            // tslint:enable:object-literal-sort-keys
        }
        return {
            anchorSize: anchorRect,
            bodySize: bodySize,
            surfaceSize: this.dimensions,
            viewportDistance: {
                // tslint:disable:object-literal-sort-keys Positional properties are more readable when they're grouped together
                top: anchorRect.top,
                right: viewportSize.width - anchorRect.right,
                bottom: viewportSize.height - anchorRect.bottom,
                left: anchorRect.left,
            },
            viewportSize: viewportSize,
            windowScroll: windowScroll,
        };
    };
    /**
     * Computes the corner of the anchor from which to animate and position the
     * menu surface.
     *
     * Only LEFT or RIGHT bit is used to position the menu surface ignoring RTL
     * context. E.g., menu surface will be positioned from right side on TOP_END.
     */
    MDCMenuSurfaceFoundation.prototype.getoriginCorner = function () {
        var corner = this.originCorner;
        var _a = this.measurements, viewportDistance = _a.viewportDistance, anchorSize = _a.anchorSize, surfaceSize = _a.surfaceSize;
        var MARGIN_TO_EDGE = MDCMenuSurfaceFoundation.numbers.MARGIN_TO_EDGE;
        var isAnchoredToBottom = this.hasBit(this.anchorCorner, CornerBit.BOTTOM);
        var availableTop;
        var availableBottom;
        if (isAnchoredToBottom) {
            availableTop = viewportDistance.top - MARGIN_TO_EDGE + anchorSize.height +
                this.anchorMargin.bottom;
            availableBottom =
                viewportDistance.bottom - MARGIN_TO_EDGE - this.anchorMargin.bottom;
        }
        else {
            availableTop =
                viewportDistance.top - MARGIN_TO_EDGE + this.anchorMargin.top;
            availableBottom = viewportDistance.bottom - MARGIN_TO_EDGE +
                anchorSize.height - this.anchorMargin.top;
        }
        var isAvailableBottom = availableBottom - surfaceSize.height > 0;
        if (!isAvailableBottom && availableTop >= availableBottom) {
            // Attach bottom side of surface to the anchor.
            corner = this.setBit(corner, CornerBit.BOTTOM);
        }
        var isRtl = this.adapter.isRtl();
        var isFlipRtl = this.hasBit(this.anchorCorner, CornerBit.FLIP_RTL);
        var hasRightBit = this.hasBit(this.anchorCorner, CornerBit.RIGHT);
        // Whether surface attached to right side of anchor element.
        var isAnchoredToRight = false;
        // Anchored to start
        if (isRtl && isFlipRtl) {
            isAnchoredToRight = !hasRightBit;
        }
        else {
            // Anchored to right
            isAnchoredToRight = hasRightBit;
        }
        var availableLeft;
        var availableRight;
        if (isAnchoredToRight) {
            availableLeft =
                viewportDistance.left + anchorSize.width + this.anchorMargin.right;
            availableRight = viewportDistance.right - this.anchorMargin.right;
        }
        else {
            availableLeft = viewportDistance.left + this.anchorMargin.left;
            availableRight =
                viewportDistance.right + anchorSize.width - this.anchorMargin.left;
        }
        var isAvailableLeft = availableLeft - surfaceSize.width > 0;
        var isAvailableRight = availableRight - surfaceSize.width > 0;
        var isOriginCornerAlignedToEnd = this.hasBit(corner, CornerBit.FLIP_RTL) &&
            this.hasBit(corner, CornerBit.RIGHT);
        if (isAvailableRight && isOriginCornerAlignedToEnd && isRtl ||
            !isAvailableLeft && isOriginCornerAlignedToEnd) {
            // Attach left side of surface to the anchor.
            corner = this.unsetBit(corner, CornerBit.RIGHT);
        }
        else if (isAvailableLeft && isAnchoredToRight && isRtl ||
            (isAvailableLeft && !isAnchoredToRight && hasRightBit) ||
            (!isAvailableRight && availableLeft >= availableRight)) {
            // Attach right side of surface to the anchor.
            corner = this.setBit(corner, CornerBit.RIGHT);
        }
        return corner;
    };
    /**
     * @param corner Origin corner of the menu surface.
     * @return Maximum height of the menu surface, based on available space. 0 indicates should not be set.
     */
    MDCMenuSurfaceFoundation.prototype.getMenuSurfaceMaxHeight = function (corner) {
        var viewportDistance = this.measurements.viewportDistance;
        var maxHeight = 0;
        var isBottomAligned = this.hasBit(corner, CornerBit.BOTTOM);
        var isBottomAnchored = this.hasBit(this.anchorCorner, CornerBit.BOTTOM);
        var MARGIN_TO_EDGE = MDCMenuSurfaceFoundation.numbers.MARGIN_TO_EDGE;
        // When maximum height is not specified, it is handled from CSS.
        if (isBottomAligned) {
            maxHeight = viewportDistance.top + this.anchorMargin.top - MARGIN_TO_EDGE;
            if (!isBottomAnchored) {
                maxHeight += this.measurements.anchorSize.height;
            }
        }
        else {
            maxHeight = viewportDistance.bottom - this.anchorMargin.bottom +
                this.measurements.anchorSize.height - MARGIN_TO_EDGE;
            if (isBottomAnchored) {
                maxHeight -= this.measurements.anchorSize.height;
            }
        }
        return maxHeight;
    };
    /**
     * @param corner Origin corner of the menu surface.
     * @return Horizontal offset of menu surface origin corner from corresponding anchor corner.
     */
    MDCMenuSurfaceFoundation.prototype.getHorizontalOriginOffset = function (corner) {
        var anchorSize = this.measurements.anchorSize;
        // isRightAligned corresponds to using the 'right' property on the surface.
        var isRightAligned = this.hasBit(corner, CornerBit.RIGHT);
        var avoidHorizontalOverlap = this.hasBit(this.anchorCorner, CornerBit.RIGHT);
        if (isRightAligned) {
            var rightOffset = avoidHorizontalOverlap ?
                anchorSize.width - this.anchorMargin.left :
                this.anchorMargin.right;
            // For hoisted or fixed elements, adjust the offset by the difference
            // between viewport width and body width so when we calculate the right
            // value (`adjustPositionForHoistedElement`) based on the element
            // position, the right property is correct.
            if (this.isHoistedElement || this.isFixedPosition) {
                return rightOffset -
                    (this.measurements.viewportSize.width -
                        this.measurements.bodySize.width);
            }
            return rightOffset;
        }
        return avoidHorizontalOverlap ? anchorSize.width - this.anchorMargin.right :
            this.anchorMargin.left;
    };
    /**
     * @param corner Origin corner of the menu surface.
     * @return Vertical offset of menu surface origin corner from corresponding anchor corner.
     */
    MDCMenuSurfaceFoundation.prototype.getVerticalOriginOffset = function (corner) {
        var anchorSize = this.measurements.anchorSize;
        var isBottomAligned = this.hasBit(corner, CornerBit.BOTTOM);
        var avoidVerticalOverlap = this.hasBit(this.anchorCorner, CornerBit.BOTTOM);
        var y = 0;
        if (isBottomAligned) {
            y = avoidVerticalOverlap ? anchorSize.height - this.anchorMargin.top :
                -this.anchorMargin.bottom;
        }
        else {
            y = avoidVerticalOverlap ?
                (anchorSize.height + this.anchorMargin.bottom) :
                this.anchorMargin.top;
        }
        return y;
    };
    /** Calculates the offsets for positioning the menu-surface when the menu-surface has been hoisted to the body. */
    MDCMenuSurfaceFoundation.prototype.adjustPositionForHoistedElement = function (position) {
        var e_1, _a;
        var _b = this.measurements, windowScroll = _b.windowScroll, viewportDistance = _b.viewportDistance;
        var props = Object.keys(position);
        try {
            for (var props_1 = __values(props), props_1_1 = props_1.next(); !props_1_1.done; props_1_1 = props_1.next()) {
                var prop = props_1_1.value;
                var value = position[prop] || 0;
                // Hoisted surfaces need to have the anchor elements location on the page added to the
                // position properties for proper alignment on the body.
                value += viewportDistance[prop];
                // Surfaces that are absolutely positioned need to have additional calculations for scroll
                // and bottom positioning.
                if (!this.isFixedPosition) {
                    if (prop === 'top') {
                        value += windowScroll.y;
                    }
                    else if (prop === 'bottom') {
                        value -= windowScroll.y;
                    }
                    else if (prop === 'left') {
                        value += windowScroll.x;
                    }
                    else { // prop === 'right'
                        value -= windowScroll.x;
                    }
                }
                position[prop] = value;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (props_1_1 && !props_1_1.done && (_a = props_1.return)) _a.call(props_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * The last focused element when the menu surface was opened should regain focus, if the user is
     * focused on or within the menu surface when it is closed.
     */
    MDCMenuSurfaceFoundation.prototype.maybeRestoreFocus = function () {
        var isRootFocused = this.adapter.isFocused();
        var childHasFocus = document.activeElement &&
            this.adapter.isElementInContainer(document.activeElement);
        if (isRootFocused || childHasFocus) {
            this.adapter.restoreFocus();
        }
    };
    MDCMenuSurfaceFoundation.prototype.hasBit = function (corner, bit) {
        return Boolean(corner & bit); // tslint:disable-line:no-bitwise
    };
    MDCMenuSurfaceFoundation.prototype.setBit = function (corner, bit) {
        return corner | bit; // tslint:disable-line:no-bitwise
    };
    MDCMenuSurfaceFoundation.prototype.unsetBit = function (corner, bit) {
        return corner ^ bit;
    };
    /**
     * isFinite that doesn't force conversion to number type.
     * Equivalent to Number.isFinite in ES2015, which is not supported in IE.
     */
    MDCMenuSurfaceFoundation.prototype.isFinite = function (num) {
        return typeof num === 'number' && isFinite(num);
    };
    return MDCMenuSurfaceFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCMenuSurface = /** @class */ (function (_super) {
    __extends(MDCMenuSurface, _super);
    function MDCMenuSurface() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCMenuSurface.attachTo = function (root) {
        return new MDCMenuSurface(root);
    };
    MDCMenuSurface.prototype.initialSyncWithDOM = function () {
        var _this = this;
        var parentEl = this.root.parentElement;
        this.anchorElement = parentEl && parentEl.classList.contains(cssClasses$d.ANCHOR) ? parentEl : null;
        if (this.root.classList.contains(cssClasses$d.FIXED)) {
            this.setFixedPosition(true);
        }
        this.handleKeydown = function (event) {
            _this.foundation.handleKeydown(event);
        };
        this.handleBodyClick = function (event) {
            _this.foundation.handleBodyClick(event);
        };
        // capture so that no race between handleBodyClick and quickOpen when
        // menusurface opened on button click which registers this listener
        this.registerBodyClickListener = function () {
            document.body.addEventListener('click', _this.handleBodyClick, { capture: true });
        };
        this.deregisterBodyClickListener = function () {
            document.body.removeEventListener('click', _this.handleBodyClick);
        };
        this.listen('keydown', this.handleKeydown);
        this.listen(strings$g.OPENED_EVENT, this.registerBodyClickListener);
        this.listen(strings$g.CLOSED_EVENT, this.deregisterBodyClickListener);
    };
    MDCMenuSurface.prototype.destroy = function () {
        this.unlisten('keydown', this.handleKeydown);
        this.unlisten(strings$g.OPENED_EVENT, this.registerBodyClickListener);
        this.unlisten(strings$g.CLOSED_EVENT, this.deregisterBodyClickListener);
        _super.prototype.destroy.call(this);
    };
    MDCMenuSurface.prototype.isOpen = function () {
        return this.foundation.isOpen();
    };
    MDCMenuSurface.prototype.open = function () {
        this.foundation.open();
    };
    MDCMenuSurface.prototype.close = function (skipRestoreFocus) {
        if (skipRestoreFocus === void 0) { skipRestoreFocus = false; }
        this.foundation.close(skipRestoreFocus);
    };
    Object.defineProperty(MDCMenuSurface.prototype, "quickOpen", {
        set: function (quickOpen) {
            this.foundation.setQuickOpen(quickOpen);
        },
        enumerable: true,
        configurable: true
    });
    /** Sets the foundation to use page offsets for an positioning when the menu is hoisted to the body. */
    MDCMenuSurface.prototype.setIsHoisted = function (isHoisted) {
        this.foundation.setIsHoisted(isHoisted);
    };
    /** Sets the element that the menu-surface is anchored to. */
    MDCMenuSurface.prototype.setMenuSurfaceAnchorElement = function (element) {
        this.anchorElement = element;
    };
    /** Sets the menu-surface to position: fixed. */
    MDCMenuSurface.prototype.setFixedPosition = function (isFixed) {
        if (isFixed) {
            this.root.classList.add(cssClasses$d.FIXED);
        }
        else {
            this.root.classList.remove(cssClasses$d.FIXED);
        }
        this.foundation.setFixedPosition(isFixed);
    };
    /** Sets the absolute x/y position to position based on. Requires the menu to be hoisted. */
    MDCMenuSurface.prototype.setAbsolutePosition = function (x, y) {
        this.foundation.setAbsolutePosition(x, y);
        this.setIsHoisted(true);
    };
    /**
     * @param corner Default anchor corner alignment of top-left surface corner.
     */
    MDCMenuSurface.prototype.setAnchorCorner = function (corner) {
        this.foundation.setAnchorCorner(corner);
    };
    MDCMenuSurface.prototype.setAnchorMargin = function (margin) {
        this.foundation.setAnchorMargin(margin);
    };
    MDCMenuSurface.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            hasAnchor: function () { return !!_this.anchorElement; },
            notifyClose: function () {
                return _this.emit(MDCMenuSurfaceFoundation.strings.CLOSED_EVENT, {});
            },
            notifyOpen: function () {
                return _this.emit(MDCMenuSurfaceFoundation.strings.OPENED_EVENT, {});
            },
            isElementInContainer: function (el) { return _this.root.contains(el); },
            isRtl: function () {
                return getComputedStyle(_this.root).getPropertyValue('direction') === 'rtl';
            },
            setTransformOrigin: function (origin) {
                var propertyName = getTransformPropertyName(window) + "-origin";
                _this.root.style.setProperty(propertyName, origin);
            },
            isFocused: function () { return document.activeElement === _this.root; },
            saveFocus: function () {
                _this.previousFocus =
                    document.activeElement;
            },
            restoreFocus: function () {
                if (_this.root.contains(document.activeElement)) {
                    if (_this.previousFocus && _this.previousFocus.focus) {
                        _this.previousFocus.focus();
                    }
                }
            },
            getInnerDimensions: function () {
                return {
                    width: _this.root.offsetWidth,
                    height: _this.root.offsetHeight
                };
            },
            getAnchorDimensions: function () { return _this.anchorElement ?
                _this.anchorElement.getBoundingClientRect() :
                null; },
            getWindowDimensions: function () {
                return { width: window.innerWidth, height: window.innerHeight };
            },
            getBodyDimensions: function () {
                return { width: document.body.clientWidth, height: document.body.clientHeight };
            },
            getWindowScroll: function () {
                return { x: window.pageXOffset, y: window.pageYOffset };
            },
            setPosition: function (position) {
                var rootHTML = _this.root;
                rootHTML.style.left = 'left' in position ? position.left + "px" : '';
                rootHTML.style.right = 'right' in position ? position.right + "px" : '';
                rootHTML.style.top = 'top' in position ? position.top + "px" : '';
                rootHTML.style.bottom =
                    'bottom' in position ? position.bottom + "px" : '';
            },
            setMaxHeight: function (height) {
                _this.root.style.maxHeight = height;
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCMenuSurfaceFoundation(adapter);
    };
    return MDCMenuSurface;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$c = {
    MENU_SELECTED_LIST_ITEM: 'mdc-menu-item--selected',
    MENU_SELECTION_GROUP: 'mdc-menu__selection-group',
    ROOT: 'mdc-menu',
};
var strings$f = {
    ARIA_CHECKED_ATTR: 'aria-checked',
    ARIA_DISABLED_ATTR: 'aria-disabled',
    CHECKBOX_SELECTOR: 'input[type="checkbox"]',
    LIST_SELECTOR: '.mdc-list',
    SELECTED_EVENT: 'MDCMenu:selected',
};
var numbers$5 = {
    FOCUS_ROOT_INDEX: -1,
};
var DefaultFocusState;
(function (DefaultFocusState) {
    DefaultFocusState[DefaultFocusState["NONE"] = 0] = "NONE";
    DefaultFocusState[DefaultFocusState["LIST_ROOT"] = 1] = "LIST_ROOT";
    DefaultFocusState[DefaultFocusState["FIRST_ITEM"] = 2] = "FIRST_ITEM";
    DefaultFocusState[DefaultFocusState["LAST_ITEM"] = 3] = "LAST_ITEM";
})(DefaultFocusState || (DefaultFocusState = {}));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCMenuFoundation = /** @class */ (function (_super) {
    __extends(MDCMenuFoundation, _super);
    function MDCMenuFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCMenuFoundation.defaultAdapter), adapter)) || this;
        _this.closeAnimationEndTimerId_ = 0;
        _this.defaultFocusState_ = DefaultFocusState.LIST_ROOT;
        return _this;
    }
    Object.defineProperty(MDCMenuFoundation, "cssClasses", {
        get: function () {
            return cssClasses$c;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuFoundation, "strings", {
        get: function () {
            return strings$f;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuFoundation, "numbers", {
        get: function () {
            return numbers$5;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenuFoundation, "defaultAdapter", {
        /**
         * @see {@link MDCMenuAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClassToElementAtIndex: function () { return undefined; },
                removeClassFromElementAtIndex: function () { return undefined; },
                addAttributeToElementAtIndex: function () { return undefined; },
                removeAttributeFromElementAtIndex: function () { return undefined; },
                elementContainsClass: function () { return false; },
                closeSurface: function () { return undefined; },
                getElementIndex: function () { return -1; },
                notifySelected: function () { return undefined; },
                getMenuItemCount: function () { return 0; },
                focusItemAtIndex: function () { return undefined; },
                focusListRoot: function () { return undefined; },
                getSelectedSiblingOfItemAtIndex: function () { return -1; },
                isSelectableItemAtIndex: function () { return false; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCMenuFoundation.prototype.destroy = function () {
        if (this.closeAnimationEndTimerId_) {
            clearTimeout(this.closeAnimationEndTimerId_);
        }
        this.adapter.closeSurface();
    };
    MDCMenuFoundation.prototype.handleKeydown = function (evt) {
        var key = evt.key, keyCode = evt.keyCode;
        var isTab = key === 'Tab' || keyCode === 9;
        if (isTab) {
            this.adapter.closeSurface(/** skipRestoreFocus */ true);
        }
    };
    MDCMenuFoundation.prototype.handleItemAction = function (listItem) {
        var _this = this;
        var index = this.adapter.getElementIndex(listItem);
        if (index < 0) {
            return;
        }
        this.adapter.notifySelected({ index: index });
        this.adapter.closeSurface();
        // Wait for the menu to close before adding/removing classes that affect styles.
        this.closeAnimationEndTimerId_ = setTimeout(function () {
            // Recompute the index in case the menu contents have changed.
            var recomputedIndex = _this.adapter.getElementIndex(listItem);
            if (recomputedIndex >= 0 &&
                _this.adapter.isSelectableItemAtIndex(recomputedIndex)) {
                _this.setSelectedIndex(recomputedIndex);
            }
        }, MDCMenuSurfaceFoundation.numbers.TRANSITION_CLOSE_DURATION);
    };
    MDCMenuFoundation.prototype.handleMenuSurfaceOpened = function () {
        switch (this.defaultFocusState_) {
            case DefaultFocusState.FIRST_ITEM:
                this.adapter.focusItemAtIndex(0);
                break;
            case DefaultFocusState.LAST_ITEM:
                this.adapter.focusItemAtIndex(this.adapter.getMenuItemCount() - 1);
                break;
            case DefaultFocusState.NONE:
                // Do nothing.
                break;
            default:
                this.adapter.focusListRoot();
                break;
        }
    };
    /**
     * Sets default focus state where the menu should focus every time when menu
     * is opened. Focuses the list root (`DefaultFocusState.LIST_ROOT`) element by
     * default.
     */
    MDCMenuFoundation.prototype.setDefaultFocusState = function (focusState) {
        this.defaultFocusState_ = focusState;
    };
    /**
     * Selects the list item at `index` within the menu.
     * @param index Index of list item within the menu.
     */
    MDCMenuFoundation.prototype.setSelectedIndex = function (index) {
        this.validatedIndex_(index);
        if (!this.adapter.isSelectableItemAtIndex(index)) {
            throw new Error('MDCMenuFoundation: No selection group at specified index.');
        }
        var prevSelectedIndex = this.adapter.getSelectedSiblingOfItemAtIndex(index);
        if (prevSelectedIndex >= 0) {
            this.adapter.removeAttributeFromElementAtIndex(prevSelectedIndex, strings$f.ARIA_CHECKED_ATTR);
            this.adapter.removeClassFromElementAtIndex(prevSelectedIndex, cssClasses$c.MENU_SELECTED_LIST_ITEM);
        }
        this.adapter.addClassToElementAtIndex(index, cssClasses$c.MENU_SELECTED_LIST_ITEM);
        this.adapter.addAttributeToElementAtIndex(index, strings$f.ARIA_CHECKED_ATTR, 'true');
    };
    /**
     * Sets the enabled state to isEnabled for the menu item at the given index.
     * @param index Index of the menu item
     * @param isEnabled The desired enabled state of the menu item.
     */
    MDCMenuFoundation.prototype.setEnabled = function (index, isEnabled) {
        this.validatedIndex_(index);
        if (isEnabled) {
            this.adapter.removeClassFromElementAtIndex(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS);
            this.adapter.addAttributeToElementAtIndex(index, strings$f.ARIA_DISABLED_ATTR, 'false');
        }
        else {
            this.adapter.addClassToElementAtIndex(index, cssClasses$j.LIST_ITEM_DISABLED_CLASS);
            this.adapter.addAttributeToElementAtIndex(index, strings$f.ARIA_DISABLED_ATTR, 'true');
        }
    };
    MDCMenuFoundation.prototype.validatedIndex_ = function (index) {
        var menuSize = this.adapter.getMenuItemCount();
        var isIndexInRange = index >= 0 && index < menuSize;
        if (!isIndexInRange) {
            throw new Error('MDCMenuFoundation: No list item at specified index.');
        }
    };
    return MDCMenuFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCMenu = /** @class */ (function (_super) {
    __extends(MDCMenu, _super);
    function MDCMenu() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCMenu.attachTo = function (root) {
        return new MDCMenu(root);
    };
    MDCMenu.prototype.initialize = function (menuSurfaceFactory, listFactory) {
        if (menuSurfaceFactory === void 0) { menuSurfaceFactory = function (el) { return new MDCMenuSurface(el); }; }
        if (listFactory === void 0) { listFactory = function (el) { return new MDCList(el); }; }
        this.menuSurfaceFactory_ = menuSurfaceFactory;
        this.listFactory_ = listFactory;
    };
    MDCMenu.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.menuSurface_ = this.menuSurfaceFactory_(this.root);
        var list = this.root.querySelector(strings$f.LIST_SELECTOR);
        if (list) {
            this.list_ = this.listFactory_(list);
            this.list_.wrapFocus = true;
        }
        else {
            this.list_ = null;
        }
        this.handleKeydown_ = function (evt) { return _this.foundation.handleKeydown(evt); };
        this.handleItemAction_ = function (evt) {
            return _this.foundation.handleItemAction(_this.items[evt.detail.index]);
        };
        this.handleMenuSurfaceOpened_ = function () {
            return _this.foundation.handleMenuSurfaceOpened();
        };
        this.menuSurface_.listen(MDCMenuSurfaceFoundation.strings.OPENED_EVENT, this.handleMenuSurfaceOpened_);
        this.listen('keydown', this.handleKeydown_);
        this.listen(MDCListFoundation.strings.ACTION_EVENT, this.handleItemAction_);
    };
    MDCMenu.prototype.destroy = function () {
        if (this.list_) {
            this.list_.destroy();
        }
        this.menuSurface_.destroy();
        this.menuSurface_.unlisten(MDCMenuSurfaceFoundation.strings.OPENED_EVENT, this.handleMenuSurfaceOpened_);
        this.unlisten('keydown', this.handleKeydown_);
        this.unlisten(MDCListFoundation.strings.ACTION_EVENT, this.handleItemAction_);
        _super.prototype.destroy.call(this);
    };
    Object.defineProperty(MDCMenu.prototype, "open", {
        get: function () {
            return this.menuSurface_.isOpen();
        },
        set: function (value) {
            if (value) {
                this.menuSurface_.open();
            }
            else {
                this.menuSurface_.close();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenu.prototype, "wrapFocus", {
        get: function () {
            return this.list_ ? this.list_.wrapFocus : false;
        },
        set: function (value) {
            if (this.list_) {
                this.list_.wrapFocus = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenu.prototype, "hasTypeahead", {
        /**
         * Sets whether the menu has typeahead functionality.
         * @param value Whether typeahead is enabled.
         */
        set: function (value) {
            if (this.list_) {
                this.list_.hasTypeahead = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenu.prototype, "typeaheadInProgress", {
        /**
         * @return Whether typeahead logic is currently matching some user prefix.
         */
        get: function () {
            return this.list_ ? this.list_.typeaheadInProgress : false;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Given the next desired character from the user, adds it to the typeahead
     * buffer. Then, attempts to find the next option matching the buffer. Wraps
     * around if at the end of options.
     *
     * @param nextChar The next character to add to the prefix buffer.
     * @param startingIndex The index from which to start matching. Only relevant
     *     when starting a new match sequence. To start a new match sequence,
     *     clear the buffer using `clearTypeaheadBuffer`, or wait for the buffer
     *     to clear after a set interval defined in list foundation. Defaults to
     *     the currently focused index.
     * @return The index of the matched item, or -1 if no match.
     */
    MDCMenu.prototype.typeaheadMatchItem = function (nextChar, startingIndex) {
        if (this.list_) {
            return this.list_.typeaheadMatchItem(nextChar, startingIndex);
        }
        return -1;
    };
    /**
     * Layout the underlying list element in the case of any dynamic updates
     * to its structure.
     */
    MDCMenu.prototype.layout = function () {
        if (this.list_) {
            this.list_.layout();
        }
    };
    Object.defineProperty(MDCMenu.prototype, "items", {
        /**
         * Return the items within the menu. Note that this only contains the set of elements within
         * the items container that are proper list items, and not supplemental / presentational DOM
         * elements.
         */
        get: function () {
            return this.list_ ? this.list_.listElements : [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCMenu.prototype, "quickOpen", {
        set: function (quickOpen) {
            this.menuSurface_.quickOpen = quickOpen;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Sets default focus state where the menu should focus every time when menu
     * is opened. Focuses the list root (`DefaultFocusState.LIST_ROOT`) element by
     * default.
     * @param focusState Default focus state.
     */
    MDCMenu.prototype.setDefaultFocusState = function (focusState) {
        this.foundation.setDefaultFocusState(focusState);
    };
    /**
     * @param corner Default anchor corner alignment of top-left menu corner.
     */
    MDCMenu.prototype.setAnchorCorner = function (corner) {
        this.menuSurface_.setAnchorCorner(corner);
    };
    MDCMenu.prototype.setAnchorMargin = function (margin) {
        this.menuSurface_.setAnchorMargin(margin);
    };
    /**
     * Sets the list item as the selected row at the specified index.
     * @param index Index of list item within menu.
     */
    MDCMenu.prototype.setSelectedIndex = function (index) {
        this.foundation.setSelectedIndex(index);
    };
    /**
     * Sets the enabled state to isEnabled for the menu item at the given index.
     * @param index Index of the menu item
     * @param isEnabled The desired enabled state of the menu item.
     */
    MDCMenu.prototype.setEnabled = function (index, isEnabled) {
        this.foundation.setEnabled(index, isEnabled);
    };
    /**
     * @return The item within the menu at the index specified.
     */
    MDCMenu.prototype.getOptionByIndex = function (index) {
        var items = this.items;
        if (index < items.length) {
            return this.items[index];
        }
        else {
            return null;
        }
    };
    /**
     * @param index A menu item's index.
     * @return The primary text within the menu at the index specified.
     */
    MDCMenu.prototype.getPrimaryTextAtIndex = function (index) {
        var item = this.getOptionByIndex(index);
        if (item && this.list_) {
            return this.list_.getPrimaryText(item) || '';
        }
        return '';
    };
    MDCMenu.prototype.setFixedPosition = function (isFixed) {
        this.menuSurface_.setFixedPosition(isFixed);
    };
    MDCMenu.prototype.setIsHoisted = function (isHoisted) {
        this.menuSurface_.setIsHoisted(isHoisted);
    };
    MDCMenu.prototype.setAbsolutePosition = function (x, y) {
        this.menuSurface_.setAbsolutePosition(x, y);
    };
    /**
     * Sets the element that the menu-surface is anchored to.
     */
    MDCMenu.prototype.setAnchorElement = function (element) {
        this.menuSurface_.anchorElement = element;
    };
    MDCMenu.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClassToElementAtIndex: function (index, className) {
                var list = _this.items;
                list[index].classList.add(className);
            },
            removeClassFromElementAtIndex: function (index, className) {
                var list = _this.items;
                list[index].classList.remove(className);
            },
            addAttributeToElementAtIndex: function (index, attr, value) {
                var list = _this.items;
                list[index].setAttribute(attr, value);
            },
            removeAttributeFromElementAtIndex: function (index, attr) {
                var list = _this.items;
                list[index].removeAttribute(attr);
            },
            elementContainsClass: function (element, className) {
                return element.classList.contains(className);
            },
            closeSurface: function (skipRestoreFocus) {
                return _this.menuSurface_.close(skipRestoreFocus);
            },
            getElementIndex: function (element) { return _this.items.indexOf(element); },
            notifySelected: function (evtData) {
                return _this.emit(strings$f.SELECTED_EVENT, {
                    index: evtData.index,
                    item: _this.items[evtData.index],
                });
            },
            getMenuItemCount: function () { return _this.items.length; },
            focusItemAtIndex: function (index) { return _this.items[index].focus(); },
            focusListRoot: function () {
                return _this.root.querySelector(strings$f.LIST_SELECTOR)
                    .focus();
            },
            isSelectableItemAtIndex: function (index) {
                return !!closest(_this.items[index], "." + cssClasses$c.MENU_SELECTION_GROUP);
            },
            getSelectedSiblingOfItemAtIndex: function (index) {
                var selectionGroupEl = closest(_this.items[index], "." + cssClasses$c.MENU_SELECTION_GROUP);
                var selectedItemEl = selectionGroupEl.querySelector("." + cssClasses$c.MENU_SELECTED_LIST_ITEM);
                return selectedItemEl ? _this.items.indexOf(selectedItemEl) : -1;
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCMenuFoundation(adapter);
    };
    return MDCMenu;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$e = {
    NOTCH_ELEMENT_SELECTOR: '.mdc-notched-outline__notch',
};
var numbers$4 = {
    // This should stay in sync with $mdc-notched-outline-padding * 2.
    NOTCH_ELEMENT_PADDING: 8,
};
var cssClasses$b = {
    NO_LABEL: 'mdc-notched-outline--no-label',
    OUTLINE_NOTCHED: 'mdc-notched-outline--notched',
    OUTLINE_UPGRADED: 'mdc-notched-outline--upgraded',
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCNotchedOutlineFoundation = /** @class */ (function (_super) {
    __extends(MDCNotchedOutlineFoundation, _super);
    function MDCNotchedOutlineFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCNotchedOutlineFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCNotchedOutlineFoundation, "strings", {
        get: function () {
            return strings$e;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCNotchedOutlineFoundation, "cssClasses", {
        get: function () {
            return cssClasses$b;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCNotchedOutlineFoundation, "numbers", {
        get: function () {
            return numbers$4;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCNotchedOutlineFoundation, "defaultAdapter", {
        /**
         * See {@link MDCNotchedOutlineAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                setNotchWidthProperty: function () { return undefined; },
                removeNotchWidthProperty: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Adds the outline notched selector and updates the notch width calculated based off of notchWidth.
     */
    MDCNotchedOutlineFoundation.prototype.notch = function (notchWidth) {
        var OUTLINE_NOTCHED = MDCNotchedOutlineFoundation.cssClasses.OUTLINE_NOTCHED;
        if (notchWidth > 0) {
            notchWidth += numbers$4.NOTCH_ELEMENT_PADDING; // Add padding from left/right.
        }
        this.adapter.setNotchWidthProperty(notchWidth);
        this.adapter.addClass(OUTLINE_NOTCHED);
    };
    /**
     * Removes notched outline selector to close the notch in the outline.
     */
    MDCNotchedOutlineFoundation.prototype.closeNotch = function () {
        var OUTLINE_NOTCHED = MDCNotchedOutlineFoundation.cssClasses.OUTLINE_NOTCHED;
        this.adapter.removeClass(OUTLINE_NOTCHED);
        this.adapter.removeNotchWidthProperty();
    };
    return MDCNotchedOutlineFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCNotchedOutline = /** @class */ (function (_super) {
    __extends(MDCNotchedOutline, _super);
    function MDCNotchedOutline() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCNotchedOutline.attachTo = function (root) {
        return new MDCNotchedOutline(root);
    };
    MDCNotchedOutline.prototype.initialSyncWithDOM = function () {
        this.notchElement_ =
            this.root.querySelector(strings$e.NOTCH_ELEMENT_SELECTOR);
        var label = this.root.querySelector('.' + MDCFloatingLabelFoundation.cssClasses.ROOT);
        if (label) {
            label.style.transitionDuration = '0s';
            this.root.classList.add(cssClasses$b.OUTLINE_UPGRADED);
            requestAnimationFrame(function () {
                label.style.transitionDuration = '';
            });
        }
        else {
            this.root.classList.add(cssClasses$b.NO_LABEL);
        }
    };
    /**
     * Updates classes and styles to open the notch to the specified width.
     * @param notchWidth The notch width in the outline.
     */
    MDCNotchedOutline.prototype.notch = function (notchWidth) {
        this.foundation.notch(notchWidth);
    };
    /**
     * Updates classes and styles to close the notch.
     */
    MDCNotchedOutline.prototype.closeNotch = function () {
        this.foundation.closeNotch();
    };
    MDCNotchedOutline.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            setNotchWidthProperty: function (width) {
                return _this.notchElement_.style.setProperty('width', width + 'px');
            },
            removeNotchWidthProperty: function () {
                return _this.notchElement_.style.removeProperty('width');
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCNotchedOutlineFoundation(adapter);
    };
    return MDCNotchedOutline;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$d = {
    NATIVE_CONTROL_SELECTOR: '.mdc-radio__native-control',
};
var cssClasses$a = {
    DISABLED: 'mdc-radio--disabled',
    ROOT: 'mdc-radio',
};

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCRadioFoundation = /** @class */ (function (_super) {
    __extends(MDCRadioFoundation, _super);
    function MDCRadioFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCRadioFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCRadioFoundation, "cssClasses", {
        get: function () {
            return cssClasses$a;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRadioFoundation, "strings", {
        get: function () {
            return strings$d;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRadioFoundation, "defaultAdapter", {
        get: function () {
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                setNativeControlDisabled: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCRadioFoundation.prototype.setDisabled = function (disabled) {
        var DISABLED = MDCRadioFoundation.cssClasses.DISABLED;
        this.adapter.setNativeControlDisabled(disabled);
        if (disabled) {
            this.adapter.addClass(DISABLED);
        }
        else {
            this.adapter.removeClass(DISABLED);
        }
    };
    return MDCRadioFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCRadio = /** @class */ (function (_super) {
    __extends(MDCRadio, _super);
    function MDCRadio() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.ripple_ = _this.createRipple_();
        return _this;
    }
    MDCRadio.attachTo = function (root) {
        return new MDCRadio(root);
    };
    Object.defineProperty(MDCRadio.prototype, "checked", {
        get: function () {
            return this.nativeControl_.checked;
        },
        set: function (checked) {
            this.nativeControl_.checked = checked;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRadio.prototype, "disabled", {
        get: function () {
            return this.nativeControl_.disabled;
        },
        set: function (disabled) {
            this.foundation.setDisabled(disabled);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRadio.prototype, "value", {
        get: function () {
            return this.nativeControl_.value;
        },
        set: function (value) {
            this.nativeControl_.value = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCRadio.prototype, "ripple", {
        get: function () {
            return this.ripple_;
        },
        enumerable: true,
        configurable: true
    });
    MDCRadio.prototype.destroy = function () {
        this.ripple_.destroy();
        _super.prototype.destroy.call(this);
    };
    MDCRadio.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            setNativeControlDisabled: function (disabled) { return _this.nativeControl_.disabled =
                disabled; },
        };
        return new MDCRadioFoundation(adapter);
    };
    MDCRadio.prototype.createRipple_ = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = __assign(__assign({}, MDCRipple.createAdapter(this)), { registerInteractionHandler: function (evtType, handler) { return _this.nativeControl_.addEventListener(evtType, handler, applyPassive()); }, deregisterInteractionHandler: function (evtType, handler) { return _this.nativeControl_.removeEventListener(evtType, handler, applyPassive()); }, 
            // Radio buttons technically go "active" whenever there is *any* keyboard interaction.
            // This is not the UI we desire.
            isSurfaceActive: function () { return false; }, isUnbounded: function () { return true; } });
        // tslint:enable:object-literal-sort-keys
        return new MDCRipple(this.root, new MDCRippleFoundation(adapter));
    };
    Object.defineProperty(MDCRadio.prototype, "nativeControl_", {
        get: function () {
            var NATIVE_CONTROL_SELECTOR = MDCRadioFoundation.strings.NATIVE_CONTROL_SELECTOR;
            var el = this.root.querySelector(NATIVE_CONTROL_SELECTOR);
            if (!el) {
                throw new Error("Radio component requires a " + NATIVE_CONTROL_SELECTOR + " element");
            }
            return el;
        },
        enumerable: true,
        configurable: true
    });
    return MDCRadio;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$9 = {
    ACTIVATED: 'mdc-select--activated',
    DISABLED: 'mdc-select--disabled',
    FOCUSED: 'mdc-select--focused',
    INVALID: 'mdc-select--invalid',
    MENU_INVALID: 'mdc-select__menu--invalid',
    OUTLINED: 'mdc-select--outlined',
    REQUIRED: 'mdc-select--required',
    ROOT: 'mdc-select',
    SELECTED_ITEM_CLASS: 'mdc-list-item--selected',
    WITH_LEADING_ICON: 'mdc-select--with-leading-icon',
};
var strings$c = {
    ARIA_CONTROLS: 'aria-controls',
    ARIA_SELECTED_ATTR: 'aria-selected',
    CHANGE_EVENT: 'MDCSelect:change',
    LABEL_SELECTOR: '.mdc-floating-label',
    LEADING_ICON_SELECTOR: '.mdc-select__icon',
    LINE_RIPPLE_SELECTOR: '.mdc-line-ripple',
    MENU_SELECTOR: '.mdc-select__menu',
    OUTLINE_SELECTOR: '.mdc-notched-outline',
    SELECTED_ITEM_SELECTOR: "." + cssClasses$9.SELECTED_ITEM_CLASS,
    SELECTED_TEXT_SELECTOR: '.mdc-select__selected-text',
    SELECT_ANCHOR_SELECTOR: '.mdc-select__anchor',
    VALUE_ATTR: 'data-value',
};
var numbers$3 = {
    LABEL_SCALE: 0.75,
    UNSET_INDEX: -1,
};

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSelectFoundation = /** @class */ (function (_super) {
    __extends(MDCSelectFoundation, _super);
    /* istanbul ignore next: optional argument is not a branch statement */
    /**
     * @param adapter
     * @param foundationMap Map from subcomponent names to their subfoundations.
     */
    function MDCSelectFoundation(adapter, foundationMap) {
        if (foundationMap === void 0) { foundationMap = {}; }
        var _this = _super.call(this, __assign(__assign({}, MDCSelectFoundation.defaultAdapter), adapter)) || this;
        // Index of the currently selected menu item.
        _this.selectedIndex = numbers$3.UNSET_INDEX;
        // VALUE_ATTR values of the menu items.
        _this.menuItemValues = [];
        // Disabled state
        _this.disabled = false;
        // isMenuOpen is used to track the state of the menu by listening to the
        // MDCMenuSurface:closed event For reference, menu.open will return false if
        // the menu is still closing, but isMenuOpen returns false only after the menu
        // has closed
        _this.isMenuOpen = false;
        // By default, select is invalid if it is required but no value is selected.
        _this.useDefaultValidation = true;
        _this.customValidity = true;
        _this.leadingIcon = foundationMap.leadingIcon;
        _this.helperText = foundationMap.helperText;
        return _this;
    }
    Object.defineProperty(MDCSelectFoundation, "cssClasses", {
        get: function () {
            return cssClasses$9;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectFoundation, "numbers", {
        get: function () {
            return numbers$3;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectFoundation, "strings", {
        get: function () {
            return strings$c;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectFoundation, "defaultAdapter", {
        /**
         * See {@link MDCSelectAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                activateBottomLine: function () { return undefined; },
                deactivateBottomLine: function () { return undefined; },
                getSelectedMenuItem: function () { return null; },
                hasLabel: function () { return false; },
                floatLabel: function () { return undefined; },
                getLabelWidth: function () { return 0; },
                setLabelRequired: function () { return undefined; },
                hasOutline: function () { return false; },
                notchOutline: function () { return undefined; },
                closeOutline: function () { return undefined; },
                setRippleCenter: function () { return undefined; },
                notifyChange: function () { return undefined; },
                setSelectedText: function () { return undefined; },
                isSelectAnchorFocused: function () { return false; },
                getSelectAnchorAttr: function () { return ''; },
                setSelectAnchorAttr: function () { return undefined; },
                removeSelectAnchorAttr: function () { return undefined; },
                addMenuClass: function () { return undefined; },
                removeMenuClass: function () { return undefined; },
                openMenu: function () { return undefined; },
                closeMenu: function () { return undefined; },
                getAnchorElement: function () { return null; },
                setMenuAnchorElement: function () { return undefined; },
                setMenuAnchorCorner: function () { return undefined; },
                setMenuWrapFocus: function () { return undefined; },
                setAttributeAtIndex: function () { return undefined; },
                focusMenuItemAtIndex: function () { return undefined; },
                getMenuItemCount: function () { return 0; },
                getMenuItemValues: function () { return []; },
                getMenuItemTextAtIndex: function () { return ''; },
                getMenuItemAttr: function () { return ''; },
                addClassAtIndex: function () { return undefined; },
                removeClassAtIndex: function () { return undefined; },
                isTypeaheadInProgress: function () { return false; },
                typeaheadMatchItem: function () { return -1; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /** Returns the index of the currently selected menu item, or -1 if none. */
    MDCSelectFoundation.prototype.getSelectedIndex = function () {
        return this.selectedIndex;
    };
    MDCSelectFoundation.prototype.setSelectedIndex = function (index, closeMenu) {
        if (closeMenu === void 0) { closeMenu = false; }
        if (index >= this.adapter.getMenuItemCount()) {
            return;
        }
        this.removeSelectionAtIndex(this.selectedIndex);
        this.setSelectionAtIndex(index);
        if (closeMenu) {
            this.adapter.closeMenu();
        }
        this.handleChange();
    };
    MDCSelectFoundation.prototype.setValue = function (value) {
        var index = this.menuItemValues.indexOf(value);
        this.setSelectedIndex(index);
    };
    MDCSelectFoundation.prototype.getValue = function () {
        var listItem = this.adapter.getSelectedMenuItem();
        if (listItem) {
            return this.adapter.getMenuItemAttr(listItem, strings$c.VALUE_ATTR) || '';
        }
        return '';
    };
    MDCSelectFoundation.prototype.getDisabled = function () {
        return this.disabled;
    };
    MDCSelectFoundation.prototype.setDisabled = function (isDisabled) {
        this.disabled = isDisabled;
        if (this.disabled) {
            this.adapter.addClass(cssClasses$9.DISABLED);
            this.adapter.closeMenu();
        }
        else {
            this.adapter.removeClass(cssClasses$9.DISABLED);
        }
        if (this.leadingIcon) {
            this.leadingIcon.setDisabled(this.disabled);
        }
        if (this.disabled) {
            // Prevent click events from focusing select. Simply pointer-events: none
            // is not enough since screenreader clicks may bypass this.
            this.adapter.removeSelectAnchorAttr('tabindex');
        }
        else {
            this.adapter.setSelectAnchorAttr('tabindex', '0');
        }
        this.adapter.setSelectAnchorAttr('aria-disabled', this.disabled.toString());
    };
    /** Opens the menu. */
    MDCSelectFoundation.prototype.openMenu = function () {
        this.adapter.addClass(cssClasses$9.ACTIVATED);
        this.adapter.openMenu();
        this.isMenuOpen = true;
        this.adapter.setSelectAnchorAttr('aria-expanded', 'true');
    };
    /**
     * @param content Sets the content of the helper text.
     */
    MDCSelectFoundation.prototype.setHelperTextContent = function (content) {
        if (this.helperText) {
            this.helperText.setContent(content);
        }
    };
    /**
     * Re-calculates if the notched outline should be notched and if the label
     * should float.
     */
    MDCSelectFoundation.prototype.layout = function () {
        if (this.adapter.hasLabel()) {
            var optionHasValue = this.getValue().length > 0;
            var isFocused = this.adapter.hasClass(cssClasses$9.FOCUSED);
            var shouldFloatAndNotch = optionHasValue || isFocused;
            var isRequired = this.adapter.hasClass(cssClasses$9.REQUIRED);
            this.notchOutline(shouldFloatAndNotch);
            this.adapter.floatLabel(shouldFloatAndNotch);
            this.adapter.setLabelRequired(isRequired);
        }
    };
    /**
     * Synchronizes the list of options with the state of the foundation. Call
     * this whenever menu options are dynamically updated.
     */
    MDCSelectFoundation.prototype.layoutOptions = function () {
        this.menuItemValues = this.adapter.getMenuItemValues();
        var selectedIndex = this.menuItemValues.indexOf(this.getValue());
        this.setSelectionAtIndex(selectedIndex);
    };
    MDCSelectFoundation.prototype.handleMenuOpened = function () {
        if (this.menuItemValues.length === 0) {
            return;
        }
        // Menu should open to the last selected element, should open to first menu item otherwise.
        var focusItemIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
        this.adapter.focusMenuItemAtIndex(focusItemIndex);
    };
    MDCSelectFoundation.prototype.handleMenuClosed = function () {
        this.adapter.removeClass(cssClasses$9.ACTIVATED);
        this.isMenuOpen = false;
        this.adapter.setSelectAnchorAttr('aria-expanded', 'false');
        // Unfocus the select if menu is closed without a selection
        if (!this.adapter.isSelectAnchorFocused()) {
            this.blur();
        }
    };
    /**
     * Handles value changes, via change event or programmatic updates.
     */
    MDCSelectFoundation.prototype.handleChange = function () {
        this.layout();
        this.adapter.notifyChange(this.getValue());
        var isRequired = this.adapter.hasClass(cssClasses$9.REQUIRED);
        if (isRequired && this.useDefaultValidation) {
            this.setValid(this.isValid());
            if (this.helperText) {
                this.helperText.setValidity(this.isValid());
            }
        }
    };
    MDCSelectFoundation.prototype.handleMenuItemAction = function (index) {
        this.setSelectedIndex(index, /** closeMenu */ true);
    };
    /**
     * Handles focus events from select element.
     */
    MDCSelectFoundation.prototype.handleFocus = function () {
        this.adapter.addClass(cssClasses$9.FOCUSED);
        this.layout();
        this.adapter.activateBottomLine();
    };
    /**
     * Handles blur events from select element.
     */
    MDCSelectFoundation.prototype.handleBlur = function () {
        if (this.isMenuOpen) {
            return;
        }
        this.blur();
    };
    MDCSelectFoundation.prototype.handleClick = function (normalizedX) {
        if (this.disabled) {
            return;
        }
        if (this.isMenuOpen) {
            this.adapter.closeMenu();
            return;
        }
        this.adapter.setRippleCenter(normalizedX);
        this.openMenu();
    };
    /**
     * Handles keydown events on select element. Depending on the type of
     * character typed, does typeahead matching or opens menu.
     */
    MDCSelectFoundation.prototype.handleKeydown = function (event) {
        if (this.isMenuOpen || !this.adapter.hasClass(cssClasses$9.FOCUSED)) {
            return;
        }
        var isEnter = normalizeKey(event) === KEY.ENTER;
        var isSpace = normalizeKey(event) === KEY.SPACEBAR;
        var arrowUp = normalizeKey(event) === KEY.ARROW_UP;
        var arrowDown = normalizeKey(event) === KEY.ARROW_DOWN;
        // Typeahead
        if (!isSpace && event.key && event.key.length === 1 ||
            isSpace && this.adapter.isTypeaheadInProgress()) {
            var key = isSpace ? ' ' : event.key;
            var typeaheadNextIndex = this.adapter.typeaheadMatchItem(key, this.selectedIndex);
            if (typeaheadNextIndex >= 0) {
                this.setSelectedIndex(typeaheadNextIndex);
            }
            event.preventDefault();
            return;
        }
        if (!isEnter && !isSpace && !arrowUp && !arrowDown) {
            return;
        }
        // Increment/decrement index as necessary and open menu.
        if (arrowUp && this.selectedIndex > 0) {
            this.setSelectedIndex(this.selectedIndex - 1);
        }
        else if (arrowDown && this.selectedIndex < this.adapter.getMenuItemCount() - 1) {
            this.setSelectedIndex(this.selectedIndex + 1);
        }
        this.openMenu();
        event.preventDefault();
    };
    /**
     * Opens/closes the notched outline.
     */
    MDCSelectFoundation.prototype.notchOutline = function (openNotch) {
        if (!this.adapter.hasOutline()) {
            return;
        }
        var isFocused = this.adapter.hasClass(cssClasses$9.FOCUSED);
        if (openNotch) {
            var labelScale = numbers$3.LABEL_SCALE;
            var labelWidth = this.adapter.getLabelWidth() * labelScale;
            this.adapter.notchOutline(labelWidth);
        }
        else if (!isFocused) {
            this.adapter.closeOutline();
        }
    };
    /**
     * Sets the aria label of the leading icon.
     */
    MDCSelectFoundation.prototype.setLeadingIconAriaLabel = function (label) {
        if (this.leadingIcon) {
            this.leadingIcon.setAriaLabel(label);
        }
    };
    /**
     * Sets the text content of the leading icon.
     */
    MDCSelectFoundation.prototype.setLeadingIconContent = function (content) {
        if (this.leadingIcon) {
            this.leadingIcon.setContent(content);
        }
    };
    MDCSelectFoundation.prototype.setUseDefaultValidation = function (useDefaultValidation) {
        this.useDefaultValidation = useDefaultValidation;
    };
    MDCSelectFoundation.prototype.setValid = function (isValid) {
        if (!this.useDefaultValidation) {
            this.customValidity = isValid;
        }
        this.adapter.setSelectAnchorAttr('aria-invalid', (!isValid).toString());
        if (isValid) {
            this.adapter.removeClass(cssClasses$9.INVALID);
            this.adapter.removeMenuClass(cssClasses$9.MENU_INVALID);
        }
        else {
            this.adapter.addClass(cssClasses$9.INVALID);
            this.adapter.addMenuClass(cssClasses$9.MENU_INVALID);
        }
    };
    MDCSelectFoundation.prototype.isValid = function () {
        if (this.useDefaultValidation &&
            this.adapter.hasClass(cssClasses$9.REQUIRED) &&
            !this.adapter.hasClass(cssClasses$9.DISABLED)) {
            // See notes for required attribute under https://www.w3.org/TR/html52/sec-forms.html#the-select-element
            // TL;DR: Invalid if no index is selected, or if the first index is selected and has an empty value.
            return this.selectedIndex !== numbers$3.UNSET_INDEX &&
                (this.selectedIndex !== 0 || Boolean(this.getValue()));
        }
        return this.customValidity;
    };
    MDCSelectFoundation.prototype.setRequired = function (isRequired) {
        if (isRequired) {
            this.adapter.addClass(cssClasses$9.REQUIRED);
        }
        else {
            this.adapter.removeClass(cssClasses$9.REQUIRED);
        }
        this.adapter.setSelectAnchorAttr('aria-required', isRequired.toString());
        this.adapter.setLabelRequired(isRequired);
    };
    MDCSelectFoundation.prototype.getRequired = function () {
        return this.adapter.getSelectAnchorAttr('aria-required') === 'true';
    };
    MDCSelectFoundation.prototype.init = function () {
        var anchorEl = this.adapter.getAnchorElement();
        if (anchorEl) {
            this.adapter.setMenuAnchorElement(anchorEl);
            this.adapter.setMenuAnchorCorner(Corner.BOTTOM_START);
        }
        this.adapter.setMenuWrapFocus(false);
        this.setDisabled(this.adapter.hasClass(cssClasses$9.DISABLED));
        this.layoutOptions();
        this.layout();
    };
    /**
     * Unfocuses the select component.
     */
    MDCSelectFoundation.prototype.blur = function () {
        this.adapter.removeClass(cssClasses$9.FOCUSED);
        this.layout();
        this.adapter.deactivateBottomLine();
        var isRequired = this.adapter.hasClass(cssClasses$9.REQUIRED);
        if (isRequired && this.useDefaultValidation) {
            this.setValid(this.isValid());
            if (this.helperText) {
                this.helperText.setValidity(this.isValid());
            }
        }
    };
    MDCSelectFoundation.prototype.setSelectionAtIndex = function (index) {
        this.selectedIndex = index;
        if (index === numbers$3.UNSET_INDEX) {
            this.adapter.setSelectedText('');
            return;
        }
        this.adapter.setSelectedText(this.adapter.getMenuItemTextAtIndex(index).trim());
        this.adapter.addClassAtIndex(index, cssClasses$9.SELECTED_ITEM_CLASS);
        this.adapter.setAttributeAtIndex(index, strings$c.ARIA_SELECTED_ATTR, 'true');
    };
    MDCSelectFoundation.prototype.removeSelectionAtIndex = function (index) {
        if (index !== numbers$3.UNSET_INDEX) {
            this.adapter.removeClassAtIndex(index, cssClasses$9.SELECTED_ITEM_CLASS);
            this.adapter.setAttributeAtIndex(index, strings$c.ARIA_SELECTED_ATTR, 'false');
        }
    };
    return MDCSelectFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$b = {
    ARIA_HIDDEN: 'aria-hidden',
    ROLE: 'role',
};
var cssClasses$8 = {
    HELPER_TEXT_VALIDATION_MSG: 'mdc-select-helper-text--validation-msg',
    HELPER_TEXT_VALIDATION_MSG_PERSISTENT: 'mdc-select-helper-text--validation-msg-persistent',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSelectHelperTextFoundation = /** @class */ (function (_super) {
    __extends(MDCSelectHelperTextFoundation, _super);
    function MDCSelectHelperTextFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCSelectHelperTextFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCSelectHelperTextFoundation, "cssClasses", {
        get: function () {
            return cssClasses$8;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectHelperTextFoundation, "strings", {
        get: function () {
            return strings$b;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectHelperTextFoundation, "defaultAdapter", {
        /**
         * See {@link MDCSelectHelperTextAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                setAttr: function () { return undefined; },
                removeAttr: function () { return undefined; },
                setContent: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Sets the content of the helper text field.
     */
    MDCSelectHelperTextFoundation.prototype.setContent = function (content) {
        this.adapter.setContent(content);
    };
    /**
     * Sets the helper text to act as a validation message.
     * By default, validation messages are hidden when the select is valid and
     * visible when the select is invalid.
     *
     * @param isValidation True to make the helper text act as an error validation
     *     message.
     */
    MDCSelectHelperTextFoundation.prototype.setValidation = function (isValidation) {
        if (isValidation) {
            this.adapter.addClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG);
        }
        else {
            this.adapter.removeClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG);
        }
    };
    /**
     * Sets the persistency of the validation helper text.
     * This keeps the validation message visible even if the select is valid,
     * though it will be displayed in the normal (grey) color.
     */
    MDCSelectHelperTextFoundation.prototype.setValidationMsgPersistent = function (isPersistent) {
        if (isPersistent) {
            this.adapter.addClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG_PERSISTENT);
        }
        else {
            this.adapter.removeClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG_PERSISTENT);
        }
    };
    /**
     * Makes the helper text visible to screen readers.
     */
    MDCSelectHelperTextFoundation.prototype.showToScreenReader = function () {
        this.adapter.removeAttr(strings$b.ARIA_HIDDEN);
    };
    /**
     * When acting as a validation message, shows/hides the helper text and
     * triggers alerts as necessary based on the select's validity.
     */
    MDCSelectHelperTextFoundation.prototype.setValidity = function (selectIsValid) {
        var isValidationMsg = this.adapter.hasClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG);
        if (!isValidationMsg) {
            // Non-validating helper-text is always displayed and does not participate
            // in validation logic.
            return;
        }
        var isPersistentValidationMsg = this.adapter.hasClass(cssClasses$8.HELPER_TEXT_VALIDATION_MSG_PERSISTENT);
        // Validating helper text is displayed if select is invalid, unless it is
        // set as persistent, in which case it always displays.
        var msgShouldDisplay = !selectIsValid || isPersistentValidationMsg;
        if (msgShouldDisplay) {
            this.showToScreenReader();
            // In addition to displaying, also trigger an alert if the select
            // has become invalid.
            if (!selectIsValid) {
                this.adapter.setAttr(strings$b.ROLE, 'alert');
            }
            else {
                this.adapter.removeAttr(strings$b.ROLE);
            }
            return;
        }
        // Hide everything.
        this.adapter.removeAttr(strings$b.ROLE);
        this.hide();
    };
    /**
     * Hides the help text from screen readers.
     */
    MDCSelectHelperTextFoundation.prototype.hide = function () {
        this.adapter.setAttr(strings$b.ARIA_HIDDEN, 'true');
    };
    return MDCSelectHelperTextFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSelectHelperText = /** @class */ (function (_super) {
    __extends(MDCSelectHelperText, _super);
    function MDCSelectHelperText() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSelectHelperText.attachTo = function (root) {
        return new MDCSelectHelperText(root);
    };
    Object.defineProperty(MDCSelectHelperText.prototype, "foundationForSelect", {
        // Provided for access by MDCSelect component
        get: function () {
            return this.foundation;
        },
        enumerable: true,
        configurable: true
    });
    MDCSelectHelperText.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            setAttr: function (attr, value) { return _this.root.setAttribute(attr, value); },
            removeAttr: function (attr) { return _this.root.removeAttribute(attr); },
            setContent: function (content) {
                _this.root.textContent = content;
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCSelectHelperTextFoundation(adapter);
    };
    return MDCSelectHelperText;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$a = {
    ICON_EVENT: 'MDCSelect:icon',
    ICON_ROLE: 'button',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var INTERACTION_EVENTS$2 = ['click', 'keydown'];
var MDCSelectIconFoundation = /** @class */ (function (_super) {
    __extends(MDCSelectIconFoundation, _super);
    function MDCSelectIconFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCSelectIconFoundation.defaultAdapter), adapter)) || this;
        _this.savedTabIndex_ = null;
        _this.interactionHandler_ = function (evt) { return _this.handleInteraction(evt); };
        return _this;
    }
    Object.defineProperty(MDCSelectIconFoundation, "strings", {
        get: function () {
            return strings$a;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelectIconFoundation, "defaultAdapter", {
        /**
         * See {@link MDCSelectIconAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                getAttr: function () { return null; },
                setAttr: function () { return undefined; },
                removeAttr: function () { return undefined; },
                setContent: function () { return undefined; },
                registerInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                notifyIconAction: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCSelectIconFoundation.prototype.init = function () {
        var _this = this;
        this.savedTabIndex_ = this.adapter.getAttr('tabindex');
        INTERACTION_EVENTS$2.forEach(function (evtType) {
            _this.adapter.registerInteractionHandler(evtType, _this.interactionHandler_);
        });
    };
    MDCSelectIconFoundation.prototype.destroy = function () {
        var _this = this;
        INTERACTION_EVENTS$2.forEach(function (evtType) {
            _this.adapter.deregisterInteractionHandler(evtType, _this.interactionHandler_);
        });
    };
    MDCSelectIconFoundation.prototype.setDisabled = function (disabled) {
        if (!this.savedTabIndex_) {
            return;
        }
        if (disabled) {
            this.adapter.setAttr('tabindex', '-1');
            this.adapter.removeAttr('role');
        }
        else {
            this.adapter.setAttr('tabindex', this.savedTabIndex_);
            this.adapter.setAttr('role', strings$a.ICON_ROLE);
        }
    };
    MDCSelectIconFoundation.prototype.setAriaLabel = function (label) {
        this.adapter.setAttr('aria-label', label);
    };
    MDCSelectIconFoundation.prototype.setContent = function (content) {
        this.adapter.setContent(content);
    };
    MDCSelectIconFoundation.prototype.handleInteraction = function (evt) {
        var isEnterKey = evt.key === 'Enter' || evt.keyCode === 13;
        if (evt.type === 'click' || isEnterKey) {
            this.adapter.notifyIconAction();
        }
    };
    return MDCSelectIconFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSelectIcon = /** @class */ (function (_super) {
    __extends(MDCSelectIcon, _super);
    function MDCSelectIcon() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSelectIcon.attachTo = function (root) {
        return new MDCSelectIcon(root);
    };
    Object.defineProperty(MDCSelectIcon.prototype, "foundationForSelect", {
        // Provided for access by MDCSelect component
        get: function () {
            return this.foundation;
        },
        enumerable: true,
        configurable: true
    });
    MDCSelectIcon.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            getAttr: function (attr) { return _this.root.getAttribute(attr); },
            setAttr: function (attr, value) { return _this.root.setAttribute(attr, value); },
            removeAttr: function (attr) { return _this.root.removeAttribute(attr); },
            setContent: function (content) {
                _this.root.textContent = content;
            },
            registerInteractionHandler: function (evtType, handler) {
                return _this.listen(evtType, handler);
            },
            deregisterInteractionHandler: function (evtType, handler) {
                return _this.unlisten(evtType, handler);
            },
            notifyIconAction: function () { return _this.emit(MDCSelectIconFoundation.strings.ICON_EVENT, {} /* evtData */, true /* shouldBubble */); },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCSelectIconFoundation(adapter);
    };
    return MDCSelectIcon;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSelect = /** @class */ (function (_super) {
    __extends(MDCSelect, _super);
    function MDCSelect() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSelect.attachTo = function (root) {
        return new MDCSelect(root);
    };
    MDCSelect.prototype.initialize = function (labelFactory, lineRippleFactory, outlineFactory, menuFactory, iconFactory, helperTextFactory) {
        if (labelFactory === void 0) { labelFactory = function (el) { return new MDCFloatingLabel(el); }; }
        if (lineRippleFactory === void 0) { lineRippleFactory = function (el) { return new MDCLineRipple(el); }; }
        if (outlineFactory === void 0) { outlineFactory = function (el) { return new MDCNotchedOutline(el); }; }
        if (menuFactory === void 0) { menuFactory = function (el) { return new MDCMenu(el); }; }
        if (iconFactory === void 0) { iconFactory = function (el) { return new MDCSelectIcon(el); }; }
        if (helperTextFactory === void 0) { helperTextFactory = function (el) { return new MDCSelectHelperText(el); }; }
        this.selectAnchor =
            this.root.querySelector(strings$c.SELECT_ANCHOR_SELECTOR);
        this.selectedText =
            this.root.querySelector(strings$c.SELECTED_TEXT_SELECTOR);
        if (!this.selectedText) {
            throw new Error('MDCSelect: Missing required element: The following selector must be present: ' +
                ("'" + strings$c.SELECTED_TEXT_SELECTOR + "'"));
        }
        if (this.selectAnchor.hasAttribute(strings$c.ARIA_CONTROLS)) {
            var helperTextElement = document.getElementById(this.selectAnchor.getAttribute(strings$c.ARIA_CONTROLS));
            if (helperTextElement) {
                this.helperText = helperTextFactory(helperTextElement);
            }
        }
        this.menuSetup(menuFactory);
        var labelElement = this.root.querySelector(strings$c.LABEL_SELECTOR);
        this.label = labelElement ? labelFactory(labelElement) : null;
        var lineRippleElement = this.root.querySelector(strings$c.LINE_RIPPLE_SELECTOR);
        this.lineRipple =
            lineRippleElement ? lineRippleFactory(lineRippleElement) : null;
        var outlineElement = this.root.querySelector(strings$c.OUTLINE_SELECTOR);
        this.outline = outlineElement ? outlineFactory(outlineElement) : null;
        var leadingIcon = this.root.querySelector(strings$c.LEADING_ICON_SELECTOR);
        if (leadingIcon) {
            this.leadingIcon = iconFactory(leadingIcon);
        }
        if (!this.root.classList.contains(cssClasses$9.OUTLINED)) {
            this.ripple = this.createRipple();
        }
    };
    /**
     * Initializes the select's event listeners and internal state based
     * on the environment's state.
     */
    MDCSelect.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleChange = function () {
            _this.foundation.handleChange();
        };
        this.handleFocus = function () {
            _this.foundation.handleFocus();
        };
        this.handleBlur = function () {
            _this.foundation.handleBlur();
        };
        this.handleClick = function (evt) {
            _this.selectAnchor.focus();
            _this.foundation.handleClick(_this.getNormalizedXCoordinate(evt));
        };
        this.handleKeydown = function (evt) {
            _this.foundation.handleKeydown(evt);
        };
        this.handleMenuItemAction = function (evt) {
            _this.foundation.handleMenuItemAction(evt.detail.index);
        };
        this.handleMenuOpened = function () {
            _this.foundation.handleMenuOpened();
        };
        this.handleMenuClosed = function () {
            _this.foundation.handleMenuClosed();
        };
        this.selectAnchor.addEventListener('focus', this.handleFocus);
        this.selectAnchor.addEventListener('blur', this.handleBlur);
        this.selectAnchor.addEventListener('click', this.handleClick);
        this.selectAnchor.addEventListener('keydown', this.handleKeydown);
        this.menu.listen(strings$g.CLOSED_EVENT, this.handleMenuClosed);
        this.menu.listen(strings$g.OPENED_EVENT, this.handleMenuOpened);
        this.menu.listen(strings$f.SELECTED_EVENT, this.handleMenuItemAction);
    };
    MDCSelect.prototype.destroy = function () {
        this.selectAnchor.removeEventListener('change', this.handleChange);
        this.selectAnchor.removeEventListener('focus', this.handleFocus);
        this.selectAnchor.removeEventListener('blur', this.handleBlur);
        this.selectAnchor.removeEventListener('keydown', this.handleKeydown);
        this.selectAnchor.removeEventListener('click', this.handleClick);
        this.menu.unlisten(strings$g.CLOSED_EVENT, this.handleMenuClosed);
        this.menu.unlisten(strings$g.OPENED_EVENT, this.handleMenuOpened);
        this.menu.unlisten(strings$f.SELECTED_EVENT, this.handleMenuItemAction);
        this.menu.destroy();
        if (this.ripple) {
            this.ripple.destroy();
        }
        if (this.outline) {
            this.outline.destroy();
        }
        if (this.leadingIcon) {
            this.leadingIcon.destroy();
        }
        if (this.helperText) {
            this.helperText.destroy();
        }
        _super.prototype.destroy.call(this);
    };
    Object.defineProperty(MDCSelect.prototype, "value", {
        get: function () {
            return this.foundation.getValue();
        },
        set: function (value) {
            this.foundation.setValue(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "selectedIndex", {
        get: function () {
            return this.foundation.getSelectedIndex();
        },
        set: function (selectedIndex) {
            this.foundation.setSelectedIndex(selectedIndex, /** closeMenu */ true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "disabled", {
        get: function () {
            return this.foundation.getDisabled();
        },
        set: function (disabled) {
            this.foundation.setDisabled(disabled);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "leadingIconAriaLabel", {
        set: function (label) {
            this.foundation.setLeadingIconAriaLabel(label);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "leadingIconContent", {
        /**
         * Sets the text content of the leading icon.
         */
        set: function (content) {
            this.foundation.setLeadingIconContent(content);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "helperTextContent", {
        /**
         * Sets the text content of the helper text.
         */
        set: function (content) {
            this.foundation.setHelperTextContent(content);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "useDefaultValidation", {
        /**
         * Enables or disables the default validation scheme where a required select
         * must be non-empty. Set to false for custom validation.
         * @param useDefaultValidation Set this to false to ignore default
         *     validation scheme.
         */
        set: function (useDefaultValidation) {
            this.foundation.setUseDefaultValidation(useDefaultValidation);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "valid", {
        /**
         * Checks if the select is in a valid state.
         */
        get: function () {
            return this.foundation.isValid();
        },
        /**
         * Sets the current invalid state of the select.
         */
        set: function (isValid) {
            this.foundation.setValid(isValid);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSelect.prototype, "required", {
        /**
         * Returns whether the select is required.
         */
        get: function () {
            return this.foundation.getRequired();
        },
        /**
         * Sets the control to the required state.
         */
        set: function (isRequired) {
            this.foundation.setRequired(isRequired);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Re-calculates if the notched outline should be notched and if the label
     * should float.
     */
    MDCSelect.prototype.layout = function () {
        this.foundation.layout();
    };
    /**
     * Synchronizes the list of options with the state of the foundation. Call
     * this whenever menu options are dynamically updated.
     */
    MDCSelect.prototype.layoutOptions = function () {
        this.foundation.layoutOptions();
        this.menu.layout();
    };
    MDCSelect.prototype.getDefaultFoundation = function () {
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = __assign(__assign(__assign(__assign({}, this.getSelectAdapterMethods()), this.getCommonAdapterMethods()), this.getOutlineAdapterMethods()), this.getLabelAdapterMethods());
        return new MDCSelectFoundation(adapter, this.getFoundationMap());
    };
    /**
     * Handles setup for the menu.
     */
    MDCSelect.prototype.menuSetup = function (menuFactory) {
        this.menuElement = this.root.querySelector(strings$c.MENU_SELECTOR);
        this.menu = menuFactory(this.menuElement);
        this.menu.hasTypeahead = true;
    };
    MDCSelect.prototype.createRipple = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = __assign(__assign({}, MDCRipple.createAdapter({ root: this.selectAnchor })), { registerInteractionHandler: function (evtType, handler) {
                _this.selectAnchor.addEventListener(evtType, handler);
            }, deregisterInteractionHandler: function (evtType, handler) {
                _this.selectAnchor.removeEventListener(evtType, handler);
            } });
        // tslint:enable:object-literal-sort-keys
        return new MDCRipple(this.selectAnchor, new MDCRippleFoundation(adapter));
    };
    MDCSelect.prototype.getSelectAdapterMethods = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            getSelectedMenuItem: function () {
                return _this.menuElement.querySelector(strings$c.SELECTED_ITEM_SELECTOR);
            },
            getMenuItemAttr: function (menuItem, attr) {
                return menuItem.getAttribute(attr);
            },
            setSelectedText: function (text) {
                _this.selectedText.textContent = text;
            },
            isSelectAnchorFocused: function () { return document.activeElement === _this.selectAnchor; },
            getSelectAnchorAttr: function (attr) {
                return _this.selectAnchor.getAttribute(attr);
            },
            setSelectAnchorAttr: function (attr, value) {
                _this.selectAnchor.setAttribute(attr, value);
            },
            removeSelectAnchorAttr: function (attr) {
                _this.selectAnchor.removeAttribute(attr);
            },
            addMenuClass: function (className) {
                _this.menuElement.classList.add(className);
            },
            removeMenuClass: function (className) {
                _this.menuElement.classList.remove(className);
            },
            openMenu: function () {
                _this.menu.open = true;
            },
            closeMenu: function () {
                _this.menu.open = false;
            },
            getAnchorElement: function () {
                return _this.root.querySelector(strings$c.SELECT_ANCHOR_SELECTOR);
            },
            setMenuAnchorElement: function (anchorEl) {
                _this.menu.setAnchorElement(anchorEl);
            },
            setMenuAnchorCorner: function (anchorCorner) {
                _this.menu.setAnchorCorner(anchorCorner);
            },
            setMenuWrapFocus: function (wrapFocus) {
                _this.menu.wrapFocus = wrapFocus;
            },
            setAttributeAtIndex: function (index, attributeName, attributeValue) {
                _this.menu.items[index].setAttribute(attributeName, attributeValue);
            },
            removeAttributeAtIndex: function (index, attributeName) {
                _this.menu.items[index].removeAttribute(attributeName);
            },
            focusMenuItemAtIndex: function (index) {
                _this.menu.items[index].focus();
            },
            getMenuItemCount: function () { return _this.menu.items.length; },
            getMenuItemValues: function () { return _this.menu.items.map(function (el) { return el.getAttribute(strings$c.VALUE_ATTR) || ''; }); },
            getMenuItemTextAtIndex: function (index) {
                return _this.menu.getPrimaryTextAtIndex(index);
            },
            addClassAtIndex: function (index, className) {
                _this.menu.items[index].classList.add(className);
            },
            removeClassAtIndex: function (index, className) {
                _this.menu.items[index].classList.remove(className);
            },
            isTypeaheadInProgress: function () { return _this.menu.typeaheadInProgress; },
            typeaheadMatchItem: function (nextChar, startingIndex) {
                return _this.menu.typeaheadMatchItem(nextChar, startingIndex);
            },
        };
        // tslint:enable:object-literal-sort-keys
    };
    MDCSelect.prototype.getCommonAdapterMethods = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            addClass: function (className) {
                _this.root.classList.add(className);
            },
            removeClass: function (className) {
                _this.root.classList.remove(className);
            },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            setRippleCenter: function (normalizedX) {
                _this.lineRipple && _this.lineRipple.setRippleCenter(normalizedX);
            },
            activateBottomLine: function () {
                _this.lineRipple && _this.lineRipple.activate();
            },
            deactivateBottomLine: function () {
                _this.lineRipple && _this.lineRipple.deactivate();
            },
            notifyChange: function (value) {
                var index = _this.selectedIndex;
                _this.emit(strings$c.CHANGE_EVENT, { value: value, index: index }, true /* shouldBubble  */);
            },
        };
        // tslint:enable:object-literal-sort-keys
    };
    MDCSelect.prototype.getOutlineAdapterMethods = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            hasOutline: function () { return Boolean(_this.outline); },
            notchOutline: function (labelWidth) {
                _this.outline && _this.outline.notch(labelWidth);
            },
            closeOutline: function () {
                _this.outline && _this.outline.closeNotch();
            },
        };
        // tslint:enable:object-literal-sort-keys
    };
    MDCSelect.prototype.getLabelAdapterMethods = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            hasLabel: function () { return !!_this.label; },
            floatLabel: function (shouldFloat) {
                _this.label && _this.label.float(shouldFloat);
            },
            getLabelWidth: function () { return _this.label ? _this.label.getWidth() : 0; },
            setLabelRequired: function (isRequired) {
                _this.label && _this.label.setRequired(isRequired);
            },
        };
        // tslint:enable:object-literal-sort-keys
    };
    /**
     * Calculates where the line ripple should start based on the x coordinate within the component.
     */
    MDCSelect.prototype.getNormalizedXCoordinate = function (evt) {
        var targetClientRect = evt.target.getBoundingClientRect();
        var xCoordinate = this.isTouchEvent(evt) ? evt.touches[0].clientX : evt.clientX;
        return xCoordinate - targetClientRect.left;
    };
    MDCSelect.prototype.isTouchEvent = function (evt) {
        return Boolean(evt.touches);
    };
    /**
     * Returns a map of all subcomponents to subfoundations.
     */
    MDCSelect.prototype.getFoundationMap = function () {
        return {
            helperText: this.helperText ? this.helperText.foundationForSelect :
                undefined,
            leadingIcon: this.leadingIcon ? this.leadingIcon.foundationForSelect :
                undefined,
        };
    };
    return MDCSelect;
}(MDCComponent));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$7 = {
    ACTIVE: 'mdc-slider--active',
    DISABLED: 'mdc-slider--disabled',
    DISCRETE: 'mdc-slider--discrete',
    FOCUS: 'mdc-slider--focus',
    HAS_TRACK_MARKER: 'mdc-slider--display-markers',
    IN_TRANSIT: 'mdc-slider--in-transit',
    IS_DISCRETE: 'mdc-slider--discrete',
    DISABLE_TOUCH_ACTION: 'mdc-slider--disable-touch-action',
};
var strings$9 = {
    ARIA_DISABLED: 'aria-disabled',
    ARIA_VALUEMAX: 'aria-valuemax',
    ARIA_VALUEMIN: 'aria-valuemin',
    ARIA_VALUENOW: 'aria-valuenow',
    CHANGE_EVENT: 'MDCSlider:change',
    INPUT_EVENT: 'MDCSlider:input',
    PIN_VALUE_MARKER_SELECTOR: '.mdc-slider__pin-value-marker',
    STEP_DATA_ATTR: 'data-step',
    THUMB_CONTAINER_SELECTOR: '.mdc-slider__thumb-container',
    TRACK_MARKER_CONTAINER_SELECTOR: '.mdc-slider__track-marker-container',
    TRACK_SELECTOR: '.mdc-slider__track',
};
var numbers$2 = {
    PAGE_FACTOR: 4,
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
// Accessing `window` without a `typeof` check will throw on Node environments.
var hasWindow = typeof window !== 'undefined';
var hasPointerEventSupport = hasWindow && !!window.PointerEvent;
var DOWN_EVENTS = hasPointerEventSupport ? ['pointerdown'] : ['mousedown', 'touchstart'];
var UP_EVENTS = hasPointerEventSupport ? ['pointerup'] : ['mouseup', 'touchend'];
var MOVE_EVENT_MAP = {
    mousedown: 'mousemove',
    pointerdown: 'pointermove',
    touchstart: 'touchmove',
};
var KEY_IDS = {
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    ARROW_UP: 'ArrowUp',
    END: 'End',
    HOME: 'Home',
    PAGE_DOWN: 'PageDown',
    PAGE_UP: 'PageUp',
};
var MDCSliderFoundation = /** @class */ (function (_super) {
    __extends(MDCSliderFoundation, _super);
    function MDCSliderFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCSliderFoundation.defaultAdapter), adapter)) || this;
        /**
         * We set this to NaN since we want it to be a number, but we can't use '0' or
         * '-1' because those could be valid tabindices set by the client code.
         */
        _this.savedTabIndex_ = NaN;
        _this.active_ = false;
        _this.inTransit_ = false;
        _this.isDiscrete_ = false;
        _this.hasTrackMarker_ = false;
        _this.handlingThumbTargetEvt_ = false;
        _this.min_ = 0;
        _this.max_ = 100;
        _this.step_ = 0;
        _this.value_ = 0;
        _this.disabled_ = false;
        _this.preventFocusState_ = false;
        _this.thumbContainerPointerHandler_ = function () { return _this.handlingThumbTargetEvt_ =
            true; };
        _this.interactionStartHandler_ = function (evt) {
            return _this.handleDown_(evt);
        };
        _this.keydownHandler_ = function (evt) { return _this.handleKeydown_(evt); };
        _this.focusHandler_ = function () { return _this.handleFocus_(); };
        _this.blurHandler_ = function () { return _this.handleBlur_(); };
        _this.resizeHandler_ = function () { return _this.layout(); };
        return _this;
    }
    Object.defineProperty(MDCSliderFoundation, "cssClasses", {
        get: function () {
            return cssClasses$7;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSliderFoundation, "strings", {
        get: function () {
            return strings$9;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSliderFoundation, "numbers", {
        get: function () {
            return numbers$2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSliderFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same
            // order as the adapter interface.
            return {
                hasClass: function () { return false; },
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                getAttribute: function () { return null; },
                setAttribute: function () { return undefined; },
                removeAttribute: function () { return undefined; },
                computeBoundingRect: function () {
                    return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 });
                },
                getTabIndex: function () { return 0; },
                registerInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                registerThumbContainerInteractionHandler: function () { return undefined; },
                deregisterThumbContainerInteractionHandler: function () { return undefined; },
                registerBodyInteractionHandler: function () { return undefined; },
                deregisterBodyInteractionHandler: function () { return undefined; },
                registerResizeHandler: function () { return undefined; },
                deregisterResizeHandler: function () { return undefined; },
                notifyInput: function () { return undefined; },
                notifyChange: function () { return undefined; },
                setThumbContainerStyleProperty: function () { return undefined; },
                setTrackStyleProperty: function () { return undefined; },
                setMarkerValue: function () { return undefined; },
                setTrackMarkers: function () { return undefined; },
                isRTL: function () { return false; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCSliderFoundation.prototype.init = function () {
        var _this = this;
        this.isDiscrete_ = this.adapter.hasClass(cssClasses$7.IS_DISCRETE);
        this.hasTrackMarker_ = this.adapter.hasClass(cssClasses$7.HAS_TRACK_MARKER);
        DOWN_EVENTS.forEach(function (evtName) {
            _this.adapter.registerInteractionHandler(evtName, _this.interactionStartHandler_);
            _this.adapter.registerThumbContainerInteractionHandler(evtName, _this.thumbContainerPointerHandler_);
        });
        if (hasPointerEventSupport) {
            /*
             * When pointermove happens, if too much sliding happens, the browser
             * believes you are panning in the x direction and stops firing
             * pointermove events and supplies its own gestures. (similar to
             * preventing default on touchmove)
             */
            this.adapter.addClass(cssClasses$7.DISABLE_TOUCH_ACTION);
        }
        this.adapter.registerInteractionHandler('keydown', this.keydownHandler_);
        this.adapter.registerInteractionHandler('focus', this.focusHandler_);
        this.adapter.registerInteractionHandler('blur', this.blurHandler_);
        this.adapter.registerResizeHandler(this.resizeHandler_);
        this.layout();
        // At last step, provide a reasonable default value to discrete slider
        if (this.isDiscrete_ && this.getStep() === 0) {
            this.step_ = 1;
        }
    };
    MDCSliderFoundation.prototype.destroy = function () {
        var _this = this;
        DOWN_EVENTS.forEach(function (evtName) {
            _this.adapter.deregisterInteractionHandler(evtName, _this.interactionStartHandler_);
            _this.adapter.deregisterThumbContainerInteractionHandler(evtName, _this.thumbContainerPointerHandler_);
        });
        this.adapter.deregisterInteractionHandler('keydown', this.keydownHandler_);
        this.adapter.deregisterInteractionHandler('focus', this.focusHandler_);
        this.adapter.deregisterInteractionHandler('blur', this.blurHandler_);
        this.adapter.deregisterResizeHandler(this.resizeHandler_);
    };
    MDCSliderFoundation.prototype.setupTrackMarker = function () {
        if (this.isDiscrete_ && this.hasTrackMarker_ && this.getStep() !== 0) {
            this.adapter.setTrackMarkers(this.getStep(), this.getMax(), this.getMin());
        }
    };
    MDCSliderFoundation.prototype.layout = function () {
        this.rect_ = this.adapter.computeBoundingRect();
        this.updateUIForCurrentValue_();
    };
    MDCSliderFoundation.prototype.getValue = function () {
        return this.value_;
    };
    MDCSliderFoundation.prototype.setValue = function (value) {
        this.setValue_(value, false);
    };
    MDCSliderFoundation.prototype.getMax = function () {
        return this.max_;
    };
    MDCSliderFoundation.prototype.setMax = function (max) {
        if (max < this.min_) {
            throw new Error('Cannot set max to be less than the slider\'s minimum value');
        }
        this.max_ = max;
        this.setValue_(this.value_, false, true);
        this.adapter.setAttribute(strings$9.ARIA_VALUEMAX, String(this.max_));
        this.setupTrackMarker();
    };
    MDCSliderFoundation.prototype.getMin = function () {
        return this.min_;
    };
    MDCSliderFoundation.prototype.setMin = function (min) {
        if (min > this.max_) {
            throw new Error('Cannot set min to be greater than the slider\'s maximum value');
        }
        this.min_ = min;
        this.setValue_(this.value_, false, true);
        this.adapter.setAttribute(strings$9.ARIA_VALUEMIN, String(this.min_));
        this.setupTrackMarker();
    };
    MDCSliderFoundation.prototype.getStep = function () {
        return this.step_;
    };
    MDCSliderFoundation.prototype.setStep = function (step) {
        if (step < 0) {
            throw new Error('Step cannot be set to a negative number');
        }
        if (this.isDiscrete_ && (typeof (step) !== 'number' || step < 1)) {
            step = 1;
        }
        this.step_ = step;
        this.setValue_(this.value_, false, true);
        this.setupTrackMarker();
    };
    MDCSliderFoundation.prototype.isDisabled = function () {
        return this.disabled_;
    };
    MDCSliderFoundation.prototype.setDisabled = function (disabled) {
        this.disabled_ = disabled;
        this.toggleClass_(cssClasses$7.DISABLED, this.disabled_);
        if (this.disabled_) {
            this.savedTabIndex_ = this.adapter.getTabIndex();
            this.adapter.setAttribute(strings$9.ARIA_DISABLED, 'true');
            this.adapter.removeAttribute('tabindex');
        }
        else {
            this.adapter.removeAttribute(strings$9.ARIA_DISABLED);
            if (!isNaN(this.savedTabIndex_)) {
                this.adapter.setAttribute('tabindex', String(this.savedTabIndex_));
            }
        }
    };
    /**
     * Called when the user starts interacting with the slider
     */
    MDCSliderFoundation.prototype.handleDown_ = function (downEvent) {
        var _this = this;
        if (this.disabled_) {
            return;
        }
        this.preventFocusState_ = true;
        this.setInTransit_(!this.handlingThumbTargetEvt_);
        this.handlingThumbTargetEvt_ = false;
        this.setActive_(true);
        var moveHandler = function (moveEvent) {
            _this.handleMove_(moveEvent);
        };
        var moveEventType = MOVE_EVENT_MAP[downEvent.type];
        // Note: upHandler is [de]registered on ALL potential pointer-related
        // release event types, since some browsers do not always fire these
        // consistently in pairs. (See
        // https://github.com/material-components/material-components-web/issues/1192)
        var upHandler = function () {
            _this.handleUp_();
            _this.adapter.deregisterBodyInteractionHandler(moveEventType, moveHandler);
            UP_EVENTS.forEach(function (evtName) { return _this.adapter.deregisterBodyInteractionHandler(evtName, upHandler); });
        };
        this.adapter.registerBodyInteractionHandler(moveEventType, moveHandler);
        UP_EVENTS.forEach(function (evtName) {
            return _this.adapter.registerBodyInteractionHandler(evtName, upHandler);
        });
        this.setValueFromEvt_(downEvent);
    };
    /**
     * Called when the user moves the slider
     */
    MDCSliderFoundation.prototype.handleMove_ = function (evt) {
        evt.preventDefault();
        this.setValueFromEvt_(evt);
    };
    /**
     * Called when the user's interaction with the slider ends
     */
    MDCSliderFoundation.prototype.handleUp_ = function () {
        this.setActive_(false);
        this.adapter.notifyChange();
    };
    /**
     * Returns the clientX of the event
     */
    MDCSliderFoundation.prototype.getClientX_ = function (evt) {
        if (evt.targetTouches &&
            evt.targetTouches.length > 0) {
            return evt.targetTouches[0].clientX;
        }
        return evt.clientX;
    };
    /**
     * Sets the slider value from an event
     */
    MDCSliderFoundation.prototype.setValueFromEvt_ = function (evt) {
        var clientX = this.getClientX_(evt);
        var value = this.computeValueFromClientX_(clientX);
        this.setValue_(value, true);
    };
    /**
     * Computes the new value from the clientX position
     */
    MDCSliderFoundation.prototype.computeValueFromClientX_ = function (clientX) {
        var _a = this, max = _a.max_, min = _a.min_;
        var xPos = clientX - this.rect_.left;
        var pctComplete = xPos / this.rect_.width;
        if (this.adapter.isRTL()) {
            pctComplete = 1 - pctComplete;
        }
        // Fit the percentage complete between the range [min,max]
        // by remapping from [0, 1] to [min, min+(max-min)].
        return min + pctComplete * (max - min);
    };
    /**
     * Handles keydown events
     */
    MDCSliderFoundation.prototype.handleKeydown_ = function (evt) {
        var keyId = this.getKeyId_(evt);
        var value = this.getValueForKeyId_(keyId);
        if (isNaN(value)) {
            return;
        }
        // Prevent page from scrolling due to key presses that would normally scroll
        // the page
        evt.preventDefault();
        this.adapter.addClass(cssClasses$7.FOCUS);
        this.setValue_(value, true);
        this.adapter.notifyChange();
    };
    /**
     * Returns the computed name of the event
     */
    MDCSliderFoundation.prototype.getKeyId_ = function (kbdEvt) {
        if (kbdEvt.key === KEY_IDS.ARROW_LEFT || kbdEvt.keyCode === 37) {
            return KEY_IDS.ARROW_LEFT;
        }
        if (kbdEvt.key === KEY_IDS.ARROW_RIGHT || kbdEvt.keyCode === 39) {
            return KEY_IDS.ARROW_RIGHT;
        }
        if (kbdEvt.key === KEY_IDS.ARROW_UP || kbdEvt.keyCode === 38) {
            return KEY_IDS.ARROW_UP;
        }
        if (kbdEvt.key === KEY_IDS.ARROW_DOWN || kbdEvt.keyCode === 40) {
            return KEY_IDS.ARROW_DOWN;
        }
        if (kbdEvt.key === KEY_IDS.HOME || kbdEvt.keyCode === 36) {
            return KEY_IDS.HOME;
        }
        if (kbdEvt.key === KEY_IDS.END || kbdEvt.keyCode === 35) {
            return KEY_IDS.END;
        }
        if (kbdEvt.key === KEY_IDS.PAGE_UP || kbdEvt.keyCode === 33) {
            return KEY_IDS.PAGE_UP;
        }
        if (kbdEvt.key === KEY_IDS.PAGE_DOWN || kbdEvt.keyCode === 34) {
            return KEY_IDS.PAGE_DOWN;
        }
        return '';
    };
    /**
     * Computes the value given a keyboard key ID
     */
    MDCSliderFoundation.prototype.getValueForKeyId_ = function (keyId) {
        var _a = this, max = _a.max_, min = _a.min_, step = _a.step_;
        var delta = step || (max - min) / 100;
        var valueNeedsToBeFlipped = this.adapter.isRTL() &&
            (keyId === KEY_IDS.ARROW_LEFT || keyId === KEY_IDS.ARROW_RIGHT);
        if (valueNeedsToBeFlipped) {
            delta = -delta;
        }
        switch (keyId) {
            case KEY_IDS.ARROW_LEFT:
            case KEY_IDS.ARROW_DOWN:
                return this.value_ - delta;
            case KEY_IDS.ARROW_RIGHT:
            case KEY_IDS.ARROW_UP:
                return this.value_ + delta;
            case KEY_IDS.HOME:
                return this.min_;
            case KEY_IDS.END:
                return this.max_;
            case KEY_IDS.PAGE_UP:
                return this.value_ + delta * numbers$2.PAGE_FACTOR;
            case KEY_IDS.PAGE_DOWN:
                return this.value_ - delta * numbers$2.PAGE_FACTOR;
            default:
                return NaN;
        }
    };
    MDCSliderFoundation.prototype.handleFocus_ = function () {
        if (this.preventFocusState_) {
            return;
        }
        this.adapter.addClass(cssClasses$7.FOCUS);
    };
    MDCSliderFoundation.prototype.handleBlur_ = function () {
        this.preventFocusState_ = false;
        this.adapter.removeClass(cssClasses$7.FOCUS);
    };
    /**
     * Sets the value of the slider
     */
    MDCSliderFoundation.prototype.setValue_ = function (value, shouldFireInput, force) {
        if (force === void 0) { force = false; }
        if (value === this.value_ && !force) {
            return;
        }
        var _a = this, min = _a.min_, max = _a.max_;
        var valueSetToBoundary = value === min || value === max;
        if (this.step_ && !valueSetToBoundary) {
            value = this.quantize_(value);
        }
        if (value < min) {
            value = min;
        }
        else if (value > max) {
            value = max;
        }
        value = value || 0; // coerce -0 to 0
        this.value_ = value;
        this.adapter.setAttribute(strings$9.ARIA_VALUENOW, String(this.value_));
        this.updateUIForCurrentValue_();
        if (shouldFireInput) {
            this.adapter.notifyInput();
            if (this.isDiscrete_) {
                this.adapter.setMarkerValue(value);
            }
        }
    };
    /**
     * Calculates the quantized value
     */
    MDCSliderFoundation.prototype.quantize_ = function (value) {
        var numSteps = Math.round(value / this.step_);
        return numSteps * this.step_;
    };
    MDCSliderFoundation.prototype.updateUIForCurrentValue_ = function () {
        var _this = this;
        var _a = this, max = _a.max_, min = _a.min_, value = _a.value_;
        var pctComplete = (value - min) / (max - min);
        var translatePx = pctComplete * this.rect_.width;
        if (this.adapter.isRTL()) {
            translatePx = this.rect_.width - translatePx;
        }
        var transformProp = hasWindow ? getCorrectPropertyName(window, 'transform') : 'transform';
        var transitionendEvtName = hasWindow ? getCorrectEventName(window, 'transitionend') : 'transitionend';
        if (this.inTransit_) {
            var onTransitionEnd_1 = function () {
                _this.setInTransit_(false);
                _this.adapter.deregisterThumbContainerInteractionHandler(transitionendEvtName, onTransitionEnd_1);
            };
            this.adapter.registerThumbContainerInteractionHandler(transitionendEvtName, onTransitionEnd_1);
        }
        requestAnimationFrame(function () {
            // NOTE(traviskaufman): It would be nice to use calc() here,
            // but IE cannot handle calcs in transforms correctly.
            // See: https://goo.gl/NC2itk
            // Also note that the -50% offset is used to center the slider thumb.
            _this.adapter.setThumbContainerStyleProperty(transformProp, "translateX(" + translatePx + "px) translateX(-50%)");
            _this.adapter.setTrackStyleProperty(transformProp, "scaleX(" + pctComplete + ")");
        });
    };
    /**
     * Toggles the active state of the slider
     */
    MDCSliderFoundation.prototype.setActive_ = function (active) {
        this.active_ = active;
        this.toggleClass_(cssClasses$7.ACTIVE, this.active_);
    };
    /**
     * Toggles the inTransit state of the slider
     */
    MDCSliderFoundation.prototype.setInTransit_ = function (inTransit) {
        this.inTransit_ = inTransit;
        this.toggleClass_(cssClasses$7.IN_TRANSIT, this.inTransit_);
    };
    /**
     * Conditionally adds or removes a class based on shouldBePresent
     */
    MDCSliderFoundation.prototype.toggleClass_ = function (className, shouldBePresent) {
        if (shouldBePresent) {
            this.adapter.addClass(className);
        }
        else {
            this.adapter.removeClass(className);
        }
    };
    return MDCSliderFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCSlider = /** @class */ (function (_super) {
    __extends(MDCSlider, _super);
    function MDCSlider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSlider.attachTo = function (root) {
        return new MDCSlider(root);
    };
    Object.defineProperty(MDCSlider.prototype, "value", {
        get: function () {
            return this.foundation.getValue();
        },
        set: function (value) {
            this.foundation.setValue(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSlider.prototype, "min", {
        get: function () {
            return this.foundation.getMin();
        },
        set: function (min) {
            this.foundation.setMin(min);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSlider.prototype, "max", {
        get: function () {
            return this.foundation.getMax();
        },
        set: function (max) {
            this.foundation.setMax(max);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSlider.prototype, "step", {
        get: function () {
            return this.foundation.getStep();
        },
        set: function (step) {
            this.foundation.setStep(step);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCSlider.prototype, "disabled", {
        get: function () {
            return this.foundation.isDisabled();
        },
        set: function (disabled) {
            this.foundation.setDisabled(disabled);
        },
        enumerable: true,
        configurable: true
    });
    MDCSlider.prototype.initialize = function () {
        this.thumbContainer_ =
            this.root.querySelector(strings$9.THUMB_CONTAINER_SELECTOR);
        this.track_ = this.root.querySelector(strings$9.TRACK_SELECTOR);
        this.pinValueMarker_ = this.root.querySelector(strings$9.PIN_VALUE_MARKER_SELECTOR);
        this.trackMarkerContainer_ = this.root.querySelector(strings$9.TRACK_MARKER_CONTAINER_SELECTOR);
    };
    MDCSlider.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take
        // a Partial<MDCFooAdapter>. To ensure we don't accidentally omit any
        // methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same
        // order as the adapter interface.
        var adapter = {
            hasClass: function (className) { return _this.root.classList.contains(className); },
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            getAttribute: function (name) { return _this.root.getAttribute(name); },
            setAttribute: function (name, value) { return _this.root.setAttribute(name, value); },
            removeAttribute: function (name) { return _this.root.removeAttribute(name); },
            computeBoundingRect: function () { return _this.root.getBoundingClientRect(); },
            getTabIndex: function () { return _this.root.tabIndex; },
            registerInteractionHandler: function (evtType, handler) {
                return _this.listen(evtType, handler, applyPassive());
            },
            deregisterInteractionHandler: function (evtType, handler) {
                return _this.unlisten(evtType, handler, applyPassive());
            },
            registerThumbContainerInteractionHandler: function (evtType, handler) {
                _this.thumbContainer_.addEventListener(evtType, handler, applyPassive());
            },
            deregisterThumbContainerInteractionHandler: function (evtType, handler) {
                _this.thumbContainer_.removeEventListener(evtType, handler, applyPassive());
            },
            registerBodyInteractionHandler: function (evtType, handler) {
                return document.body.addEventListener(evtType, handler);
            },
            deregisterBodyInteractionHandler: function (evtType, handler) {
                return document.body.removeEventListener(evtType, handler);
            },
            registerResizeHandler: function (handler) {
                return window.addEventListener('resize', handler);
            },
            deregisterResizeHandler: function (handler) {
                return window.removeEventListener('resize', handler);
            },
            notifyInput: function () { return _this.emit(strings$9.INPUT_EVENT, _this); },
            notifyChange: function () { return _this.emit(strings$9.CHANGE_EVENT, _this); },
            setThumbContainerStyleProperty: function (propertyName, value) {
                _this.thumbContainer_.style.setProperty(propertyName, value);
            },
            setTrackStyleProperty: function (propertyName, value) {
                return _this.track_.style.setProperty(propertyName, value);
            },
            setMarkerValue: function (value) { return _this.pinValueMarker_.innerText =
                value.toLocaleString(); },
            setTrackMarkers: function (step, max, min) {
                var stepStr = step.toLocaleString();
                var maxStr = max.toLocaleString();
                var minStr = min.toLocaleString();
                // keep calculation in css for better rounding/subpixel behavior
                var markerAmount = "((" + maxStr + " - " + minStr + ") / " + stepStr + ")";
                var markerWidth = "2px";
                var markerBkgdImage = "linear-gradient(to right, currentColor " + markerWidth + ", transparent 0)";
                var markerBkgdLayout = "0 center / calc((100% - " + markerWidth + ") / " + markerAmount + ") 100% repeat-x";
                var markerBkgdShorthand = markerBkgdImage + " " + markerBkgdLayout;
                _this.trackMarkerContainer_.style.setProperty('background', markerBkgdShorthand);
            },
            isRTL: function () { return getComputedStyle(_this.root).direction === 'rtl'; },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCSliderFoundation(adapter);
    };
    MDCSlider.prototype.initialSyncWithDOM = function () {
        var origValueNow = this.parseFloat_(this.root.getAttribute(strings$9.ARIA_VALUENOW), this.value);
        var min = this.parseFloat_(this.root.getAttribute(strings$9.ARIA_VALUEMIN), this.min);
        var max = this.parseFloat_(this.root.getAttribute(strings$9.ARIA_VALUEMAX), this.max);
        // min and max need to be set in the right order to avoid throwing an error
        // when the new min is greater than the default max.
        if (min >= this.max) {
            this.max = max;
            this.min = min;
        }
        else {
            this.min = min;
            this.max = max;
        }
        this.step = this.parseFloat_(this.root.getAttribute(strings$9.STEP_DATA_ATTR), this.step);
        this.value = origValueNow;
        this.disabled =
            (this.root.hasAttribute(strings$9.ARIA_DISABLED) &&
                this.root.getAttribute(strings$9.ARIA_DISABLED) !== 'false');
        this.foundation.setupTrackMarker();
    };
    MDCSlider.prototype.layout = function () {
        this.foundation.layout();
    };
    MDCSlider.prototype.stepUp = function (amount) {
        if (amount === void 0) { amount = (this.step || 1); }
        this.value += amount;
    };
    MDCSlider.prototype.stepDown = function (amount) {
        if (amount === void 0) { amount = (this.step || 1); }
        this.value -= amount;
    };
    MDCSlider.prototype.parseFloat_ = function (str, defaultValue) {
        var num = parseFloat(str); // tslint:disable-line:ban
        var isNumeric = typeof num === 'number' && isFinite(num);
        return isNumeric ? num : defaultValue;
    };
    return MDCSlider;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$6 = {
    ANIMATING: 'mdc-tab-scroller--animating',
    SCROLL_AREA_SCROLL: 'mdc-tab-scroller__scroll-area--scroll',
    SCROLL_TEST: 'mdc-tab-scroller__test',
};
var strings$8 = {
    AREA_SELECTOR: '.mdc-tab-scroller__scroll-area',
    CONTENT_SELECTOR: '.mdc-tab-scroller__scroll-content',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTL = /** @class */ (function () {
    function MDCTabScrollerRTL(adapter) {
        this.adapter = adapter;
    }
    return MDCTabScrollerRTL;
}());

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLDefault = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLDefault, _super);
    function MDCTabScrollerRTLDefault() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLDefault.prototype.getScrollPositionRTL = function () {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var right = this.calculateScrollEdges_().right;
        // Scroll values on most browsers are ints instead of floats so we round
        return Math.round(right - currentScrollLeft);
    };
    MDCTabScrollerRTLDefault.prototype.scrollToRTL = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(edges.right - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLDefault.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLDefault.prototype.getAnimatingScrollPosition = function (scrollX) {
        return scrollX;
    };
    MDCTabScrollerRTLDefault.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter.getScrollContentOffsetWidth();
        var rootWidth = this.adapter.getScrollAreaOffsetWidth();
        return {
            left: 0,
            right: contentWidth - rootWidth,
        };
    };
    MDCTabScrollerRTLDefault.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.left, scrollX), edges.right);
    };
    return MDCTabScrollerRTLDefault;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLNegative = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLNegative, _super);
    function MDCTabScrollerRTLNegative() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLNegative.prototype.getScrollPositionRTL = function (translateX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        return Math.round(translateX - currentScrollLeft);
    };
    MDCTabScrollerRTLNegative.prototype.scrollToRTL = function (scrollX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(-scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLNegative.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft - scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: clampedScrollLeft - currentScrollLeft,
        };
    };
    MDCTabScrollerRTLNegative.prototype.getAnimatingScrollPosition = function (scrollX, translateX) {
        return scrollX - translateX;
    };
    MDCTabScrollerRTLNegative.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter.getScrollContentOffsetWidth();
        var rootWidth = this.adapter.getScrollAreaOffsetWidth();
        return {
            left: rootWidth - contentWidth,
            right: 0,
        };
    };
    MDCTabScrollerRTLNegative.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.max(Math.min(edges.right, scrollX), edges.left);
    };
    return MDCTabScrollerRTLNegative;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerRTLReverse = /** @class */ (function (_super) {
    __extends(MDCTabScrollerRTLReverse, _super);
    function MDCTabScrollerRTLReverse() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScrollerRTLReverse.prototype.getScrollPositionRTL = function (translateX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        // Scroll values on most browsers are ints instead of floats so we round
        return Math.round(currentScrollLeft - translateX);
    };
    MDCTabScrollerRTLReverse.prototype.scrollToRTL = function (scrollX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: currentScrollLeft - clampedScrollLeft,
        };
    };
    MDCTabScrollerRTLReverse.prototype.incrementScrollRTL = function (scrollX) {
        var currentScrollLeft = this.adapter.getScrollAreaScrollLeft();
        var clampedScrollLeft = this.clampScrollValue_(currentScrollLeft + scrollX);
        return {
            finalScrollPosition: clampedScrollLeft,
            scrollDelta: currentScrollLeft - clampedScrollLeft,
        };
    };
    MDCTabScrollerRTLReverse.prototype.getAnimatingScrollPosition = function (scrollX, translateX) {
        return scrollX + translateX;
    };
    MDCTabScrollerRTLReverse.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter.getScrollContentOffsetWidth();
        var rootWidth = this.adapter.getScrollAreaOffsetWidth();
        return {
            left: contentWidth - rootWidth,
            right: 0,
        };
    };
    MDCTabScrollerRTLReverse.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.right, scrollX), edges.left);
    };
    return MDCTabScrollerRTLReverse;
}(MDCTabScrollerRTL));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScrollerFoundation = /** @class */ (function (_super) {
    __extends(MDCTabScrollerFoundation, _super);
    function MDCTabScrollerFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCTabScrollerFoundation.defaultAdapter), adapter)) || this;
        /**
         * Controls whether we should handle the transitionend and interaction events during the animation.
         */
        _this.isAnimating_ = false;
        return _this;
    }
    Object.defineProperty(MDCTabScrollerFoundation, "cssClasses", {
        get: function () {
            return cssClasses$6;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabScrollerFoundation, "strings", {
        get: function () {
            return strings$8;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabScrollerFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                eventTargetMatchesSelector: function () { return false; },
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                addScrollAreaClass: function () { return undefined; },
                setScrollAreaStyleProperty: function () { return undefined; },
                setScrollContentStyleProperty: function () { return undefined; },
                getScrollContentStyleValue: function () { return ''; },
                setScrollAreaScrollLeft: function () { return undefined; },
                getScrollAreaScrollLeft: function () { return 0; },
                getScrollContentOffsetWidth: function () { return 0; },
                getScrollAreaOffsetWidth: function () { return 0; },
                computeScrollAreaClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                computeScrollContentClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                computeHorizontalScrollbarHeight: function () { return 0; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabScrollerFoundation.prototype.init = function () {
        // Compute horizontal scrollbar height on scroller with overflow initially hidden, then update overflow to scroll
        // and immediately adjust bottom margin to avoid the scrollbar initially appearing before JS runs.
        var horizontalScrollbarHeight = this.adapter.computeHorizontalScrollbarHeight();
        this.adapter.setScrollAreaStyleProperty('margin-bottom', -horizontalScrollbarHeight + 'px');
        this.adapter.addScrollAreaClass(MDCTabScrollerFoundation.cssClasses.SCROLL_AREA_SCROLL);
    };
    /**
     * Computes the current visual scroll position
     */
    MDCTabScrollerFoundation.prototype.getScrollPosition = function () {
        if (this.isRTL_()) {
            return this.computeCurrentScrollPositionRTL_();
        }
        var currentTranslateX = this.calculateCurrentTranslateX_();
        var scrollLeft = this.adapter.getScrollAreaScrollLeft();
        return scrollLeft - currentTranslateX;
    };
    /**
     * Handles interaction events that occur during transition
     */
    MDCTabScrollerFoundation.prototype.handleInteraction = function () {
        // Early exit if we aren't animating
        if (!this.isAnimating_) {
            return;
        }
        // Prevent other event listeners from handling this event
        this.stopScrollAnimation_();
    };
    /**
     * Handles the transitionend event
     */
    MDCTabScrollerFoundation.prototype.handleTransitionEnd = function (evt) {
        // Early exit if we aren't animating or the event was triggered by a different element.
        var evtTarget = evt.target;
        if (!this.isAnimating_ ||
            !this.adapter.eventTargetMatchesSelector(evtTarget, MDCTabScrollerFoundation.strings.CONTENT_SELECTOR)) {
            return;
        }
        this.isAnimating_ = false;
        this.adapter.removeClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
    };
    /**
     * Increment the scroll value by the scrollXIncrement using animation.
     * @param scrollXIncrement The value by which to increment the scroll position
     */
    MDCTabScrollerFoundation.prototype.incrementScroll = function (scrollXIncrement) {
        // Early exit for non-operational increment values
        if (scrollXIncrement === 0) {
            return;
        }
        this.animate_(this.getIncrementScrollOperation_(scrollXIncrement));
    };
    /**
     * Increment the scroll value by the scrollXIncrement without animation.
     * @param scrollXIncrement The value by which to increment the scroll position
     */
    MDCTabScrollerFoundation.prototype.incrementScrollImmediate = function (scrollXIncrement) {
        // Early exit for non-operational increment values
        if (scrollXIncrement === 0) {
            return;
        }
        var operation = this.getIncrementScrollOperation_(scrollXIncrement);
        if (operation.scrollDelta === 0) {
            return;
        }
        this.stopScrollAnimation_();
        this.adapter.setScrollAreaScrollLeft(operation.finalScrollPosition);
    };
    /**
     * Scrolls to the given scrollX value
     */
    MDCTabScrollerFoundation.prototype.scrollTo = function (scrollX) {
        if (this.isRTL_()) {
            return this.scrollToRTL_(scrollX);
        }
        this.scrollTo_(scrollX);
    };
    /**
     * @return Browser-specific {@link MDCTabScrollerRTL} instance.
     */
    MDCTabScrollerFoundation.prototype.getRTLScroller = function () {
        if (!this.rtlScrollerInstance_) {
            this.rtlScrollerInstance_ = this.rtlScrollerFactory_();
        }
        return this.rtlScrollerInstance_;
    };
    /**
     * @return translateX value from a CSS matrix transform function string.
     */
    MDCTabScrollerFoundation.prototype.calculateCurrentTranslateX_ = function () {
        var transformValue = this.adapter.getScrollContentStyleValue('transform');
        // Early exit if no transform is present
        if (transformValue === 'none') {
            return 0;
        }
        // The transform value comes back as a matrix transformation in the form
        // of `matrix(a, b, c, d, tx, ty)`. We only care about tx (translateX) so
        // we're going to grab all the parenthesized values, strip out tx, and
        // parse it.
        var match = /\((.+?)\)/.exec(transformValue);
        if (!match) {
            return 0;
        }
        var matrixParams = match[1];
        // tslint:disable-next-line:ban-ts-ignore "Unused vars" should be a linter warning, not a compiler error.
        // @ts-ignore These unused variables should retain their semantic names for clarity.
        var _a = __read(matrixParams.split(','), 6); _a[0]; _a[1]; _a[2]; _a[3]; var tx = _a[4]; _a[5];
        return parseFloat(tx); // tslint:disable-line:ban
    };
    /**
     * Calculates a safe scroll value that is > 0 and < the max scroll value
     * @param scrollX The distance to scroll
     */
    MDCTabScrollerFoundation.prototype.clampScrollValue_ = function (scrollX) {
        var edges = this.calculateScrollEdges_();
        return Math.min(Math.max(edges.left, scrollX), edges.right);
    };
    MDCTabScrollerFoundation.prototype.computeCurrentScrollPositionRTL_ = function () {
        var translateX = this.calculateCurrentTranslateX_();
        return this.getRTLScroller().getScrollPositionRTL(translateX);
    };
    MDCTabScrollerFoundation.prototype.calculateScrollEdges_ = function () {
        var contentWidth = this.adapter.getScrollContentOffsetWidth();
        var rootWidth = this.adapter.getScrollAreaOffsetWidth();
        return {
            left: 0,
            right: contentWidth - rootWidth,
        };
    };
    /**
     * Internal scroll method
     * @param scrollX The new scroll position
     */
    MDCTabScrollerFoundation.prototype.scrollTo_ = function (scrollX) {
        var currentScrollX = this.getScrollPosition();
        var safeScrollX = this.clampScrollValue_(scrollX);
        var scrollDelta = safeScrollX - currentScrollX;
        this.animate_({
            finalScrollPosition: safeScrollX,
            scrollDelta: scrollDelta,
        });
    };
    /**
     * Internal RTL scroll method
     * @param scrollX The new scroll position
     */
    MDCTabScrollerFoundation.prototype.scrollToRTL_ = function (scrollX) {
        var animation = this.getRTLScroller().scrollToRTL(scrollX);
        this.animate_(animation);
    };
    /**
     * Internal method to compute the increment scroll operation values.
     * @param scrollX The desired scroll position increment
     * @return MDCTabScrollerAnimation with the sanitized values for performing the scroll operation.
     */
    MDCTabScrollerFoundation.prototype.getIncrementScrollOperation_ = function (scrollX) {
        if (this.isRTL_()) {
            return this.getRTLScroller().incrementScrollRTL(scrollX);
        }
        var currentScrollX = this.getScrollPosition();
        var targetScrollX = scrollX + currentScrollX;
        var safeScrollX = this.clampScrollValue_(targetScrollX);
        var scrollDelta = safeScrollX - currentScrollX;
        return {
            finalScrollPosition: safeScrollX,
            scrollDelta: scrollDelta,
        };
    };
    /**
     * Animates the tab scrolling
     * @param animation The animation to apply
     */
    MDCTabScrollerFoundation.prototype.animate_ = function (animation) {
        var _this = this;
        // Early exit if translateX is 0, which means there's no animation to perform
        if (animation.scrollDelta === 0) {
            return;
        }
        this.stopScrollAnimation_();
        // This animation uses the FLIP approach.
        // Read more here: https://aerotwist.com/blog/flip-your-animations/
        this.adapter.setScrollAreaScrollLeft(animation.finalScrollPosition);
        this.adapter.setScrollContentStyleProperty('transform', "translateX(" + animation.scrollDelta + "px)");
        // Force repaint
        this.adapter.computeScrollAreaClientRect();
        requestAnimationFrame(function () {
            _this.adapter.addClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
            _this.adapter.setScrollContentStyleProperty('transform', 'none');
        });
        this.isAnimating_ = true;
    };
    /**
     * Stops scroll animation
     */
    MDCTabScrollerFoundation.prototype.stopScrollAnimation_ = function () {
        this.isAnimating_ = false;
        var currentScrollPosition = this.getAnimatingScrollPosition_();
        this.adapter.removeClass(MDCTabScrollerFoundation.cssClasses.ANIMATING);
        this.adapter.setScrollContentStyleProperty('transform', 'translateX(0px)');
        this.adapter.setScrollAreaScrollLeft(currentScrollPosition);
    };
    /**
     * Gets the current scroll position during animation
     */
    MDCTabScrollerFoundation.prototype.getAnimatingScrollPosition_ = function () {
        var currentTranslateX = this.calculateCurrentTranslateX_();
        var scrollLeft = this.adapter.getScrollAreaScrollLeft();
        if (this.isRTL_()) {
            return this.getRTLScroller().getAnimatingScrollPosition(scrollLeft, currentTranslateX);
        }
        return scrollLeft - currentTranslateX;
    };
    /**
     * Determines the RTL Scroller to use
     */
    MDCTabScrollerFoundation.prototype.rtlScrollerFactory_ = function () {
        // Browsers have three different implementations of scrollLeft in RTL mode,
        // dependent on the browser. The behavior is based off the max LTR
        // scrollLeft value and 0.
        //
        // * Default scrolling in RTL *
        //    - Left-most value: 0
        //    - Right-most value: Max LTR scrollLeft value
        //
        // * Negative scrolling in RTL *
        //    - Left-most value: Negated max LTR scrollLeft value
        //    - Right-most value: 0
        //
        // * Reverse scrolling in RTL *
        //    - Left-most value: Max LTR scrollLeft value
        //    - Right-most value: 0
        //
        // We use those principles below to determine which RTL scrollLeft
        // behavior is implemented in the current browser.
        var initialScrollLeft = this.adapter.getScrollAreaScrollLeft();
        this.adapter.setScrollAreaScrollLeft(initialScrollLeft - 1);
        var newScrollLeft = this.adapter.getScrollAreaScrollLeft();
        // If the newScrollLeft value is negative,then we know that the browser has
        // implemented negative RTL scrolling, since all other implementations have
        // only positive values.
        if (newScrollLeft < 0) {
            // Undo the scrollLeft test check
            this.adapter.setScrollAreaScrollLeft(initialScrollLeft);
            return new MDCTabScrollerRTLNegative(this.adapter);
        }
        var rootClientRect = this.adapter.computeScrollAreaClientRect();
        var contentClientRect = this.adapter.computeScrollContentClientRect();
        var rightEdgeDelta = Math.round(contentClientRect.right - rootClientRect.right);
        // Undo the scrollLeft test check
        this.adapter.setScrollAreaScrollLeft(initialScrollLeft);
        // By calculating the clientRect of the root element and the clientRect of
        // the content element, we can determine how much the scroll value changed
        // when we performed the scrollLeft subtraction above.
        if (rightEdgeDelta === newScrollLeft) {
            return new MDCTabScrollerRTLReverse(this.adapter);
        }
        return new MDCTabScrollerRTLDefault(this.adapter);
    };
    MDCTabScrollerFoundation.prototype.isRTL_ = function () {
        return this.adapter.getScrollContentStyleValue('direction') === 'rtl';
    };
    return MDCTabScrollerFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/**
 * Stores result from computeHorizontalScrollbarHeight to avoid redundant processing.
 */
var horizontalScrollbarHeight_;
/**
 * Computes the height of browser-rendered horizontal scrollbars using a self-created test element.
 * May return 0 (e.g. on OS X browsers under default configuration).
 */
function computeHorizontalScrollbarHeight(documentObj, shouldCacheResult) {
    if (shouldCacheResult === void 0) { shouldCacheResult = true; }
    if (shouldCacheResult && typeof horizontalScrollbarHeight_ !== 'undefined') {
        return horizontalScrollbarHeight_;
    }
    var el = documentObj.createElement('div');
    el.classList.add(cssClasses$6.SCROLL_TEST);
    documentObj.body.appendChild(el);
    var horizontalScrollbarHeight = el.offsetHeight - el.clientHeight;
    documentObj.body.removeChild(el);
    if (shouldCacheResult) {
        horizontalScrollbarHeight_ = horizontalScrollbarHeight;
    }
    return horizontalScrollbarHeight;
}

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabScroller = /** @class */ (function (_super) {
    __extends(MDCTabScroller, _super);
    function MDCTabScroller() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabScroller.attachTo = function (root) {
        return new MDCTabScroller(root);
    };
    MDCTabScroller.prototype.initialize = function () {
        this.area_ = this.root.querySelector(MDCTabScrollerFoundation.strings.AREA_SELECTOR);
        this.content_ = this.root.querySelector(MDCTabScrollerFoundation.strings.CONTENT_SELECTOR);
    };
    MDCTabScroller.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleInteraction_ = function () { return _this.foundation.handleInteraction(); };
        this.handleTransitionEnd_ = function (evt) { return _this.foundation.handleTransitionEnd(evt); };
        this.area_.addEventListener('wheel', this.handleInteraction_, applyPassive());
        this.area_.addEventListener('touchstart', this.handleInteraction_, applyPassive());
        this.area_.addEventListener('pointerdown', this.handleInteraction_, applyPassive());
        this.area_.addEventListener('mousedown', this.handleInteraction_, applyPassive());
        this.area_.addEventListener('keydown', this.handleInteraction_, applyPassive());
        this.content_.addEventListener('transitionend', this.handleTransitionEnd_);
    };
    MDCTabScroller.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
        this.area_.removeEventListener('wheel', this.handleInteraction_, applyPassive());
        this.area_.removeEventListener('touchstart', this.handleInteraction_, applyPassive());
        this.area_.removeEventListener('pointerdown', this.handleInteraction_, applyPassive());
        this.area_.removeEventListener('mousedown', this.handleInteraction_, applyPassive());
        this.area_.removeEventListener('keydown', this.handleInteraction_, applyPassive());
        this.content_.removeEventListener('transitionend', this.handleTransitionEnd_);
    };
    MDCTabScroller.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            eventTargetMatchesSelector: function (evtTarget, selector) {
                return matches(evtTarget, selector);
            },
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            addScrollAreaClass: function (className) { return _this.area_.classList.add(className); },
            setScrollAreaStyleProperty: function (prop, value) {
                return _this.area_.style.setProperty(prop, value);
            },
            setScrollContentStyleProperty: function (prop, value) {
                return _this.content_.style.setProperty(prop, value);
            },
            getScrollContentStyleValue: function (propName) {
                return window.getComputedStyle(_this.content_).getPropertyValue(propName);
            },
            setScrollAreaScrollLeft: function (scrollX) { return _this.area_.scrollLeft = scrollX; },
            getScrollAreaScrollLeft: function () { return _this.area_.scrollLeft; },
            getScrollContentOffsetWidth: function () { return _this.content_.offsetWidth; },
            getScrollAreaOffsetWidth: function () { return _this.area_.offsetWidth; },
            computeScrollAreaClientRect: function () { return _this.area_.getBoundingClientRect(); },
            computeScrollContentClientRect: function () {
                return _this.content_.getBoundingClientRect();
            },
            computeHorizontalScrollbarHeight: function () {
                return computeHorizontalScrollbarHeight(document);
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCTabScrollerFoundation(adapter);
    };
    /**
     * Returns the current visual scroll position
     */
    MDCTabScroller.prototype.getScrollPosition = function () {
        return this.foundation.getScrollPosition();
    };
    /**
     * Returns the width of the scroll content
     */
    MDCTabScroller.prototype.getScrollContentWidth = function () {
        return this.content_.offsetWidth;
    };
    /**
     * Increments the scroll value by the given amount
     * @param scrollXIncrement The pixel value by which to increment the scroll value
     */
    MDCTabScroller.prototype.incrementScroll = function (scrollXIncrement) {
        this.foundation.incrementScroll(scrollXIncrement);
    };
    /**
     * Scrolls to the given pixel position
     * @param scrollX The pixel value to scroll to
     */
    MDCTabScroller.prototype.scrollTo = function (scrollX) {
        this.foundation.scrollTo(scrollX);
    };
    return MDCTabScroller;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$5 = {
    ACTIVE: 'mdc-tab-indicator--active',
    FADE: 'mdc-tab-indicator--fade',
    NO_TRANSITION: 'mdc-tab-indicator--no-transition',
};
var strings$7 = {
    CONTENT_SELECTOR: '.mdc-tab-indicator__content',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCTabIndicatorFoundation, _super);
    function MDCTabIndicatorFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCTabIndicatorFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCTabIndicatorFoundation, "cssClasses", {
        get: function () {
            return cssClasses$5;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabIndicatorFoundation, "strings", {
        get: function () {
            return strings$7;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabIndicatorFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                computeContentClientRect: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                setContentStyleProperty: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabIndicatorFoundation.prototype.computeContentClientRect = function () {
        return this.adapter.computeContentClientRect();
    };
    return MDCTabIndicatorFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/* istanbul ignore next: subclass is not a branch statement */
var MDCFadingTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCFadingTabIndicatorFoundation, _super);
    function MDCFadingTabIndicatorFoundation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCFadingTabIndicatorFoundation.prototype.activate = function () {
        this.adapter.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    MDCFadingTabIndicatorFoundation.prototype.deactivate = function () {
        this.adapter.removeClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    return MDCFadingTabIndicatorFoundation;
}(MDCTabIndicatorFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
/* istanbul ignore next: subclass is not a branch statement */
var MDCSlidingTabIndicatorFoundation = /** @class */ (function (_super) {
    __extends(MDCSlidingTabIndicatorFoundation, _super);
    function MDCSlidingTabIndicatorFoundation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCSlidingTabIndicatorFoundation.prototype.activate = function (previousIndicatorClientRect) {
        // Early exit if no indicator is present to handle cases where an indicator
        // may be activated without a prior indicator state
        if (!previousIndicatorClientRect) {
            this.adapter.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
            return;
        }
        // This animation uses the FLIP approach. You can read more about it at the link below:
        // https://aerotwist.com/blog/flip-your-animations/
        // Calculate the dimensions based on the dimensions of the previous indicator
        var currentClientRect = this.computeContentClientRect();
        var widthDelta = previousIndicatorClientRect.width / currentClientRect.width;
        var xPosition = previousIndicatorClientRect.left - currentClientRect.left;
        this.adapter.addClass(MDCTabIndicatorFoundation.cssClasses.NO_TRANSITION);
        this.adapter.setContentStyleProperty('transform', "translateX(" + xPosition + "px) scaleX(" + widthDelta + ")");
        // Force repaint before updating classes and transform to ensure the transform properly takes effect
        this.computeContentClientRect();
        this.adapter.removeClass(MDCTabIndicatorFoundation.cssClasses.NO_TRANSITION);
        this.adapter.addClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
        this.adapter.setContentStyleProperty('transform', '');
    };
    MDCSlidingTabIndicatorFoundation.prototype.deactivate = function () {
        this.adapter.removeClass(MDCTabIndicatorFoundation.cssClasses.ACTIVE);
    };
    return MDCSlidingTabIndicatorFoundation;
}(MDCTabIndicatorFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabIndicator = /** @class */ (function (_super) {
    __extends(MDCTabIndicator, _super);
    function MDCTabIndicator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabIndicator.attachTo = function (root) {
        return new MDCTabIndicator(root);
    };
    MDCTabIndicator.prototype.initialize = function () {
        this.content_ = this.root.querySelector(MDCTabIndicatorFoundation.strings.CONTENT_SELECTOR);
    };
    MDCTabIndicator.prototype.computeContentClientRect = function () {
        return this.foundation.computeContentClientRect();
    };
    MDCTabIndicator.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            computeContentClientRect: function () { return _this.content_.getBoundingClientRect(); },
            setContentStyleProperty: function (prop, value) {
                return _this.content_.style.setProperty(prop, value);
            },
        };
        // tslint:enable:object-literal-sort-keys
        if (this.root.classList.contains(MDCTabIndicatorFoundation.cssClasses.FADE)) {
            return new MDCFadingTabIndicatorFoundation(adapter);
        }
        // Default to the sliding indicator
        return new MDCSlidingTabIndicatorFoundation(adapter);
    };
    MDCTabIndicator.prototype.activate = function (previousIndicatorClientRect) {
        this.foundation.activate(previousIndicatorClientRect);
    };
    MDCTabIndicator.prototype.deactivate = function () {
        this.foundation.deactivate();
    };
    return MDCTabIndicator;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$4 = {
    ACTIVE: 'mdc-tab--active',
};
var strings$6 = {
    ARIA_SELECTED: 'aria-selected',
    CONTENT_SELECTOR: '.mdc-tab__content',
    INTERACTED_EVENT: 'MDCTab:interacted',
    RIPPLE_SELECTOR: '.mdc-tab__ripple',
    TABINDEX: 'tabIndex',
    TAB_INDICATOR_SELECTOR: '.mdc-tab-indicator',
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTabFoundation = /** @class */ (function (_super) {
    __extends(MDCTabFoundation, _super);
    function MDCTabFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCTabFoundation.defaultAdapter), adapter)) || this;
        _this.focusOnActivate_ = true;
        return _this;
    }
    Object.defineProperty(MDCTabFoundation, "cssClasses", {
        get: function () {
            return cssClasses$4;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabFoundation, "strings", {
        get: function () {
            return strings$6;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                setAttr: function () { return undefined; },
                activateIndicator: function () { return undefined; },
                deactivateIndicator: function () { return undefined; },
                notifyInteracted: function () { return undefined; },
                getOffsetLeft: function () { return 0; },
                getOffsetWidth: function () { return 0; },
                getContentOffsetLeft: function () { return 0; },
                getContentOffsetWidth: function () { return 0; },
                focus: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTabFoundation.prototype.handleClick = function () {
        // It's up to the parent component to keep track of the active Tab and
        // ensure we don't activate a Tab that's already active.
        this.adapter.notifyInteracted();
    };
    MDCTabFoundation.prototype.isActive = function () {
        return this.adapter.hasClass(cssClasses$4.ACTIVE);
    };
    /**
     * Sets whether the tab should focus itself when activated
     */
    MDCTabFoundation.prototype.setFocusOnActivate = function (focusOnActivate) {
        this.focusOnActivate_ = focusOnActivate;
    };
    /**
     * Activates the Tab
     */
    MDCTabFoundation.prototype.activate = function (previousIndicatorClientRect) {
        this.adapter.addClass(cssClasses$4.ACTIVE);
        this.adapter.setAttr(strings$6.ARIA_SELECTED, 'true');
        this.adapter.setAttr(strings$6.TABINDEX, '0');
        this.adapter.activateIndicator(previousIndicatorClientRect);
        if (this.focusOnActivate_) {
            this.adapter.focus();
        }
    };
    /**
     * Deactivates the Tab
     */
    MDCTabFoundation.prototype.deactivate = function () {
        // Early exit
        if (!this.isActive()) {
            return;
        }
        this.adapter.removeClass(cssClasses$4.ACTIVE);
        this.adapter.setAttr(strings$6.ARIA_SELECTED, 'false');
        this.adapter.setAttr(strings$6.TABINDEX, '-1');
        this.adapter.deactivateIndicator();
    };
    /**
     * Returns the dimensions of the Tab
     */
    MDCTabFoundation.prototype.computeDimensions = function () {
        var rootWidth = this.adapter.getOffsetWidth();
        var rootLeft = this.adapter.getOffsetLeft();
        var contentWidth = this.adapter.getContentOffsetWidth();
        var contentLeft = this.adapter.getContentOffsetLeft();
        return {
            contentLeft: rootLeft + contentLeft,
            contentRight: rootLeft + contentLeft + contentWidth,
            rootLeft: rootLeft,
            rootRight: rootLeft + rootWidth,
        };
    };
    return MDCTabFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTab = /** @class */ (function (_super) {
    __extends(MDCTab, _super);
    function MDCTab() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTab.attachTo = function (root) {
        return new MDCTab(root);
    };
    MDCTab.prototype.initialize = function (rippleFactory, tabIndicatorFactory) {
        if (rippleFactory === void 0) { rippleFactory = function (el, foundation) { return new MDCRipple(el, foundation); }; }
        if (tabIndicatorFactory === void 0) { tabIndicatorFactory = function (el) { return new MDCTabIndicator(el); }; }
        this.id = this.root.id;
        var rippleSurface = this.root.querySelector(MDCTabFoundation.strings.RIPPLE_SELECTOR);
        var rippleAdapter = __assign(__assign({}, MDCRipple.createAdapter(this)), { addClass: function (className) { return rippleSurface.classList.add(className); }, removeClass: function (className) { return rippleSurface.classList.remove(className); }, updateCssVariable: function (varName, value) { return rippleSurface.style.setProperty(varName, value); } });
        var rippleFoundation = new MDCRippleFoundation(rippleAdapter);
        this.ripple_ = rippleFactory(this.root, rippleFoundation);
        var tabIndicatorElement = this.root.querySelector(MDCTabFoundation.strings.TAB_INDICATOR_SELECTOR);
        this.tabIndicator_ = tabIndicatorFactory(tabIndicatorElement);
        this.content_ = this.root.querySelector(MDCTabFoundation.strings.CONTENT_SELECTOR);
    };
    MDCTab.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleClick_ = function () { return _this.foundation.handleClick(); };
        this.listen('click', this.handleClick_);
    };
    MDCTab.prototype.destroy = function () {
        this.unlisten('click', this.handleClick_);
        this.ripple_.destroy();
        _super.prototype.destroy.call(this);
    };
    MDCTab.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            setAttr: function (attr, value) { return _this.root.setAttribute(attr, value); },
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            activateIndicator: function (previousIndicatorClientRect) {
                return _this.tabIndicator_.activate(previousIndicatorClientRect);
            },
            deactivateIndicator: function () { return _this.tabIndicator_.deactivate(); },
            notifyInteracted: function () { return _this.emit(MDCTabFoundation.strings.INTERACTED_EVENT, { tabId: _this.id }, true /* bubble */); },
            getOffsetLeft: function () { return _this.root.offsetLeft; },
            getOffsetWidth: function () { return _this.root.offsetWidth; },
            getContentOffsetLeft: function () { return _this.content_.offsetLeft; },
            getContentOffsetWidth: function () { return _this.content_.offsetWidth; },
            focus: function () { return _this.root.focus(); },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCTabFoundation(adapter);
    };
    Object.defineProperty(MDCTab.prototype, "active", {
        /**
         * Getter for the active state of the tab
         */
        get: function () {
            return this.foundation.isActive();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTab.prototype, "focusOnActivate", {
        set: function (focusOnActivate) {
            this.foundation.setFocusOnActivate(focusOnActivate);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Activates the tab
     */
    MDCTab.prototype.activate = function (computeIndicatorClientRect) {
        this.foundation.activate(computeIndicatorClientRect);
    };
    /**
     * Deactivates the tab
     */
    MDCTab.prototype.deactivate = function () {
        this.foundation.deactivate();
    };
    /**
     * Returns the indicator's client rect
     */
    MDCTab.prototype.computeIndicatorClientRect = function () {
        return this.tabIndicator_.computeContentClientRect();
    };
    MDCTab.prototype.computeDimensions = function () {
        return this.foundation.computeDimensions();
    };
    /**
     * Focuses the tab
     */
    MDCTab.prototype.focus = function () {
        this.root.focus();
    };
    return MDCTab;
}(MDCComponent));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$5 = {
    ARROW_LEFT_KEY: 'ArrowLeft',
    ARROW_RIGHT_KEY: 'ArrowRight',
    END_KEY: 'End',
    ENTER_KEY: 'Enter',
    HOME_KEY: 'Home',
    SPACE_KEY: 'Space',
    TAB_ACTIVATED_EVENT: 'MDCTabBar:activated',
    TAB_SCROLLER_SELECTOR: '.mdc-tab-scroller',
    TAB_SELECTOR: '.mdc-tab',
};
var numbers$1 = {
    ARROW_LEFT_KEYCODE: 37,
    ARROW_RIGHT_KEYCODE: 39,
    END_KEYCODE: 35,
    ENTER_KEYCODE: 13,
    EXTRA_SCROLL_AMOUNT: 20,
    HOME_KEYCODE: 36,
    SPACE_KEYCODE: 32,
};

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var ACCEPTABLE_KEYS = new Set();
// IE11 has no support for new Set with iterable so we need to initialize this by hand
ACCEPTABLE_KEYS.add(strings$5.ARROW_LEFT_KEY);
ACCEPTABLE_KEYS.add(strings$5.ARROW_RIGHT_KEY);
ACCEPTABLE_KEYS.add(strings$5.END_KEY);
ACCEPTABLE_KEYS.add(strings$5.HOME_KEY);
ACCEPTABLE_KEYS.add(strings$5.ENTER_KEY);
ACCEPTABLE_KEYS.add(strings$5.SPACE_KEY);
var KEYCODE_MAP = new Map();
// IE11 has no support for new Map with iterable so we need to initialize this by hand
KEYCODE_MAP.set(numbers$1.ARROW_LEFT_KEYCODE, strings$5.ARROW_LEFT_KEY);
KEYCODE_MAP.set(numbers$1.ARROW_RIGHT_KEYCODE, strings$5.ARROW_RIGHT_KEY);
KEYCODE_MAP.set(numbers$1.END_KEYCODE, strings$5.END_KEY);
KEYCODE_MAP.set(numbers$1.HOME_KEYCODE, strings$5.HOME_KEY);
KEYCODE_MAP.set(numbers$1.ENTER_KEYCODE, strings$5.ENTER_KEY);
KEYCODE_MAP.set(numbers$1.SPACE_KEYCODE, strings$5.SPACE_KEY);
var MDCTabBarFoundation = /** @class */ (function (_super) {
    __extends(MDCTabBarFoundation, _super);
    function MDCTabBarFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCTabBarFoundation.defaultAdapter), adapter)) || this;
        _this.useAutomaticActivation_ = false;
        return _this;
    }
    Object.defineProperty(MDCTabBarFoundation, "strings", {
        get: function () {
            return strings$5;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabBarFoundation, "numbers", {
        get: function () {
            return numbers$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabBarFoundation, "defaultAdapter", {
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                scrollTo: function () { return undefined; },
                incrementScroll: function () { return undefined; },
                getScrollPosition: function () { return 0; },
                getScrollContentWidth: function () { return 0; },
                getOffsetWidth: function () { return 0; },
                isRTL: function () { return false; },
                setActiveTab: function () { return undefined; },
                activateTabAtIndex: function () { return undefined; },
                deactivateTabAtIndex: function () { return undefined; },
                focusTabAtIndex: function () { return undefined; },
                getTabIndicatorClientRectAtIndex: function () { return ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }); },
                getTabDimensionsAtIndex: function () { return ({ rootLeft: 0, rootRight: 0, contentLeft: 0, contentRight: 0 }); },
                getPreviousActiveTabIndex: function () { return -1; },
                getFocusedTabIndex: function () { return -1; },
                getIndexOfTabById: function () { return -1; },
                getTabListLength: function () { return 0; },
                notifyTabActivated: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Switches between automatic and manual activation modes.
     * See https://www.w3.org/TR/wai-aria-practices/#tabpanel for examples.
     */
    MDCTabBarFoundation.prototype.setUseAutomaticActivation = function (useAutomaticActivation) {
        this.useAutomaticActivation_ = useAutomaticActivation;
    };
    MDCTabBarFoundation.prototype.activateTab = function (index) {
        var previousActiveIndex = this.adapter.getPreviousActiveTabIndex();
        if (!this.indexIsInRange_(index) || index === previousActiveIndex) {
            return;
        }
        var previousClientRect;
        if (previousActiveIndex !== -1) {
            this.adapter.deactivateTabAtIndex(previousActiveIndex);
            previousClientRect =
                this.adapter.getTabIndicatorClientRectAtIndex(previousActiveIndex);
        }
        this.adapter.activateTabAtIndex(index, previousClientRect);
        this.scrollIntoView(index);
        this.adapter.notifyTabActivated(index);
    };
    MDCTabBarFoundation.prototype.handleKeyDown = function (evt) {
        // Get the key from the event
        var key = this.getKeyFromEvent_(evt);
        // Early exit if the event key isn't one of the keyboard navigation keys
        if (key === undefined) {
            return;
        }
        // Prevent default behavior for movement keys, but not for activation keys, since :active is used to apply ripple
        if (!this.isActivationKey_(key)) {
            evt.preventDefault();
        }
        if (this.useAutomaticActivation_) {
            if (this.isActivationKey_(key)) {
                return;
            }
            var index = this.determineTargetFromKey_(this.adapter.getPreviousActiveTabIndex(), key);
            this.adapter.setActiveTab(index);
            this.scrollIntoView(index);
        }
        else {
            var focusedTabIndex = this.adapter.getFocusedTabIndex();
            if (this.isActivationKey_(key)) {
                this.adapter.setActiveTab(focusedTabIndex);
            }
            else {
                var index = this.determineTargetFromKey_(focusedTabIndex, key);
                this.adapter.focusTabAtIndex(index);
                this.scrollIntoView(index);
            }
        }
    };
    /**
     * Handles the MDCTab:interacted event
     */
    MDCTabBarFoundation.prototype.handleTabInteraction = function (evt) {
        this.adapter.setActiveTab(this.adapter.getIndexOfTabById(evt.detail.tabId));
    };
    /**
     * Scrolls the tab at the given index into view
     * @param index The tab index to make visible
     */
    MDCTabBarFoundation.prototype.scrollIntoView = function (index) {
        // Early exit if the index is out of range
        if (!this.indexIsInRange_(index)) {
            return;
        }
        // Always scroll to 0 if scrolling to the 0th index
        if (index === 0) {
            return this.adapter.scrollTo(0);
        }
        // Always scroll to the max value if scrolling to the Nth index
        // MDCTabScroller.scrollTo() will never scroll past the max possible value
        if (index === this.adapter.getTabListLength() - 1) {
            return this.adapter.scrollTo(this.adapter.getScrollContentWidth());
        }
        if (this.isRTL_()) {
            return this.scrollIntoViewRTL_(index);
        }
        this.scrollIntoView_(index);
    };
    /**
     * Private method for determining the index of the destination tab based on what key was pressed
     * @param origin The original index from which to determine the destination
     * @param key The name of the key
     */
    MDCTabBarFoundation.prototype.determineTargetFromKey_ = function (origin, key) {
        var isRTL = this.isRTL_();
        var maxIndex = this.adapter.getTabListLength() - 1;
        var shouldGoToEnd = key === strings$5.END_KEY;
        var shouldDecrement = key === strings$5.ARROW_LEFT_KEY && !isRTL || key === strings$5.ARROW_RIGHT_KEY && isRTL;
        var shouldIncrement = key === strings$5.ARROW_RIGHT_KEY && !isRTL || key === strings$5.ARROW_LEFT_KEY && isRTL;
        var index = origin;
        if (shouldGoToEnd) {
            index = maxIndex;
        }
        else if (shouldDecrement) {
            index -= 1;
        }
        else if (shouldIncrement) {
            index += 1;
        }
        else {
            index = 0;
        }
        if (index < 0) {
            index = maxIndex;
        }
        else if (index > maxIndex) {
            index = 0;
        }
        return index;
    };
    /**
     * Calculates the scroll increment that will make the tab at the given index visible
     * @param index The index of the tab
     * @param nextIndex The index of the next tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the Tab Bar
     */
    MDCTabBarFoundation.prototype.calculateScrollIncrement_ = function (index, nextIndex, scrollPosition, barWidth) {
        var nextTabDimensions = this.adapter.getTabDimensionsAtIndex(nextIndex);
        var relativeContentLeft = nextTabDimensions.contentLeft - scrollPosition - barWidth;
        var relativeContentRight = nextTabDimensions.contentRight - scrollPosition;
        var leftIncrement = relativeContentRight - numbers$1.EXTRA_SCROLL_AMOUNT;
        var rightIncrement = relativeContentLeft + numbers$1.EXTRA_SCROLL_AMOUNT;
        if (nextIndex < index) {
            return Math.min(leftIncrement, 0);
        }
        return Math.max(rightIncrement, 0);
    };
    /**
     * Calculates the scroll increment that will make the tab at the given index visible in RTL
     * @param index The index of the tab
     * @param nextIndex The index of the next tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the Tab Bar
     * @param scrollContentWidth The width of the scroll content
     */
    MDCTabBarFoundation.prototype.calculateScrollIncrementRTL_ = function (index, nextIndex, scrollPosition, barWidth, scrollContentWidth) {
        var nextTabDimensions = this.adapter.getTabDimensionsAtIndex(nextIndex);
        var relativeContentLeft = scrollContentWidth - nextTabDimensions.contentLeft - scrollPosition;
        var relativeContentRight = scrollContentWidth - nextTabDimensions.contentRight - scrollPosition - barWidth;
        var leftIncrement = relativeContentRight + numbers$1.EXTRA_SCROLL_AMOUNT;
        var rightIncrement = relativeContentLeft - numbers$1.EXTRA_SCROLL_AMOUNT;
        if (nextIndex > index) {
            return Math.max(leftIncrement, 0);
        }
        return Math.min(rightIncrement, 0);
    };
    /**
     * Determines the index of the adjacent tab closest to either edge of the Tab Bar
     * @param index The index of the tab
     * @param tabDimensions The dimensions of the tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the tab bar
     */
    MDCTabBarFoundation.prototype.findAdjacentTabIndexClosestToEdge_ = function (index, tabDimensions, scrollPosition, barWidth) {
        /**
         * Tabs are laid out in the Tab Scroller like this:
         *
         *    Scroll Position
         *    +---+
         *    |   |   Bar Width
         *    |   +-----------------------------------+
         *    |   |                                   |
         *    |   V                                   V
         *    |   +-----------------------------------+
         *    V   |             Tab Scroller          |
         *    +------------+--------------+-------------------+
         *    |    Tab     |      Tab     |        Tab        |
         *    +------------+--------------+-------------------+
         *        |                                   |
         *        +-----------------------------------+
         *
         * To determine the next adjacent index, we look at the Tab root left and
         * Tab root right, both relative to the scroll position. If the Tab root
         * left is less than 0, then we know it's out of view to the left. If the
         * Tab root right minus the bar width is greater than 0, we know the Tab is
         * out of view to the right. From there, we either increment or decrement
         * the index.
         */
        var relativeRootLeft = tabDimensions.rootLeft - scrollPosition;
        var relativeRootRight = tabDimensions.rootRight - scrollPosition - barWidth;
        var relativeRootDelta = relativeRootLeft + relativeRootRight;
        var leftEdgeIsCloser = relativeRootLeft < 0 || relativeRootDelta < 0;
        var rightEdgeIsCloser = relativeRootRight > 0 || relativeRootDelta > 0;
        if (leftEdgeIsCloser) {
            return index - 1;
        }
        if (rightEdgeIsCloser) {
            return index + 1;
        }
        return -1;
    };
    /**
     * Determines the index of the adjacent tab closest to either edge of the Tab Bar in RTL
     * @param index The index of the tab
     * @param tabDimensions The dimensions of the tab
     * @param scrollPosition The current scroll position
     * @param barWidth The width of the tab bar
     * @param scrollContentWidth The width of the scroller content
     */
    MDCTabBarFoundation.prototype.findAdjacentTabIndexClosestToEdgeRTL_ = function (index, tabDimensions, scrollPosition, barWidth, scrollContentWidth) {
        var rootLeft = scrollContentWidth - tabDimensions.rootLeft - barWidth - scrollPosition;
        var rootRight = scrollContentWidth - tabDimensions.rootRight - scrollPosition;
        var rootDelta = rootLeft + rootRight;
        var leftEdgeIsCloser = rootLeft > 0 || rootDelta > 0;
        var rightEdgeIsCloser = rootRight < 0 || rootDelta < 0;
        if (leftEdgeIsCloser) {
            return index + 1;
        }
        if (rightEdgeIsCloser) {
            return index - 1;
        }
        return -1;
    };
    /**
     * Returns the key associated with a keydown event
     * @param evt The keydown event
     */
    MDCTabBarFoundation.prototype.getKeyFromEvent_ = function (evt) {
        if (ACCEPTABLE_KEYS.has(evt.key)) {
            return evt.key;
        }
        return KEYCODE_MAP.get(evt.keyCode);
    };
    MDCTabBarFoundation.prototype.isActivationKey_ = function (key) {
        return key === strings$5.SPACE_KEY || key === strings$5.ENTER_KEY;
    };
    /**
     * Returns whether a given index is inclusively between the ends
     * @param index The index to test
     */
    MDCTabBarFoundation.prototype.indexIsInRange_ = function (index) {
        return index >= 0 && index < this.adapter.getTabListLength();
    };
    /**
     * Returns the view's RTL property
     */
    MDCTabBarFoundation.prototype.isRTL_ = function () {
        return this.adapter.isRTL();
    };
    /**
     * Scrolls the tab at the given index into view for left-to-right user agents.
     * @param index The index of the tab to scroll into view
     */
    MDCTabBarFoundation.prototype.scrollIntoView_ = function (index) {
        var scrollPosition = this.adapter.getScrollPosition();
        var barWidth = this.adapter.getOffsetWidth();
        var tabDimensions = this.adapter.getTabDimensionsAtIndex(index);
        var nextIndex = this.findAdjacentTabIndexClosestToEdge_(index, tabDimensions, scrollPosition, barWidth);
        if (!this.indexIsInRange_(nextIndex)) {
            return;
        }
        var scrollIncrement = this.calculateScrollIncrement_(index, nextIndex, scrollPosition, barWidth);
        this.adapter.incrementScroll(scrollIncrement);
    };
    /**
     * Scrolls the tab at the given index into view in RTL
     * @param index The tab index to make visible
     */
    MDCTabBarFoundation.prototype.scrollIntoViewRTL_ = function (index) {
        var scrollPosition = this.adapter.getScrollPosition();
        var barWidth = this.adapter.getOffsetWidth();
        var tabDimensions = this.adapter.getTabDimensionsAtIndex(index);
        var scrollWidth = this.adapter.getScrollContentWidth();
        var nextIndex = this.findAdjacentTabIndexClosestToEdgeRTL_(index, tabDimensions, scrollPosition, barWidth, scrollWidth);
        if (!this.indexIsInRange_(nextIndex)) {
            return;
        }
        var scrollIncrement = this.calculateScrollIncrementRTL_(index, nextIndex, scrollPosition, barWidth, scrollWidth);
        this.adapter.incrementScroll(scrollIncrement);
    };
    return MDCTabBarFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$4 = MDCTabBarFoundation.strings;
var tabIdCounter = 0;
var MDCTabBar = /** @class */ (function (_super) {
    __extends(MDCTabBar, _super);
    function MDCTabBar() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTabBar.attachTo = function (root) {
        return new MDCTabBar(root);
    };
    Object.defineProperty(MDCTabBar.prototype, "focusOnActivate", {
        set: function (focusOnActivate) {
            this.tabList_.forEach(function (tab) { return tab.focusOnActivate = focusOnActivate; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTabBar.prototype, "useAutomaticActivation", {
        set: function (useAutomaticActivation) {
            this.foundation.setUseAutomaticActivation(useAutomaticActivation);
        },
        enumerable: true,
        configurable: true
    });
    MDCTabBar.prototype.initialize = function (tabFactory, tabScrollerFactory) {
        if (tabFactory === void 0) { tabFactory = function (el) { return new MDCTab(el); }; }
        if (tabScrollerFactory === void 0) { tabScrollerFactory = function (el) { return new MDCTabScroller(el); }; }
        this.tabList_ = this.instantiateTabs_(tabFactory);
        this.tabScroller_ = this.instantiateTabScroller_(tabScrollerFactory);
    };
    MDCTabBar.prototype.initialSyncWithDOM = function () {
        var _this = this;
        this.handleTabInteraction_ = function (evt) {
            return _this.foundation.handleTabInteraction(evt);
        };
        this.handleKeyDown_ = function (evt) { return _this.foundation.handleKeyDown(evt); };
        this.listen(MDCTabFoundation.strings.INTERACTED_EVENT, this.handleTabInteraction_);
        this.listen('keydown', this.handleKeyDown_);
        for (var i = 0; i < this.tabList_.length; i++) {
            if (this.tabList_[i].active) {
                this.scrollIntoView(i);
                break;
            }
        }
    };
    MDCTabBar.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
        this.unlisten(MDCTabFoundation.strings.INTERACTED_EVENT, this.handleTabInteraction_);
        this.unlisten('keydown', this.handleKeyDown_);
        this.tabList_.forEach(function (tab) { return tab.destroy(); });
        if (this.tabScroller_) {
            this.tabScroller_.destroy();
        }
    };
    MDCTabBar.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            scrollTo: function (scrollX) { return _this.tabScroller_.scrollTo(scrollX); },
            incrementScroll: function (scrollXIncrement) {
                return _this.tabScroller_.incrementScroll(scrollXIncrement);
            },
            getScrollPosition: function () { return _this.tabScroller_.getScrollPosition(); },
            getScrollContentWidth: function () { return _this.tabScroller_.getScrollContentWidth(); },
            getOffsetWidth: function () { return _this.root.offsetWidth; },
            isRTL: function () { return window.getComputedStyle(_this.root).getPropertyValue('direction') === 'rtl'; },
            setActiveTab: function (index) { return _this.foundation.activateTab(index); },
            activateTabAtIndex: function (index, clientRect) {
                return _this.tabList_[index].activate(clientRect);
            },
            deactivateTabAtIndex: function (index) { return _this.tabList_[index].deactivate(); },
            focusTabAtIndex: function (index) { return _this.tabList_[index].focus(); },
            getTabIndicatorClientRectAtIndex: function (index) {
                return _this.tabList_[index].computeIndicatorClientRect();
            },
            getTabDimensionsAtIndex: function (index) {
                return _this.tabList_[index].computeDimensions();
            },
            getPreviousActiveTabIndex: function () {
                for (var i = 0; i < _this.tabList_.length; i++) {
                    if (_this.tabList_[i].active) {
                        return i;
                    }
                }
                return -1;
            },
            getFocusedTabIndex: function () {
                var tabElements = _this.getTabElements_();
                var activeElement = document.activeElement;
                return tabElements.indexOf(activeElement);
            },
            getIndexOfTabById: function (id) {
                for (var i = 0; i < _this.tabList_.length; i++) {
                    if (_this.tabList_[i].id === id) {
                        return i;
                    }
                }
                return -1;
            },
            getTabListLength: function () { return _this.tabList_.length; },
            notifyTabActivated: function (index) { return _this.emit(strings$4.TAB_ACTIVATED_EVENT, { index: index }, true); },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCTabBarFoundation(adapter);
    };
    /**
     * Activates the tab at the given index
     * @param index The index of the tab
     */
    MDCTabBar.prototype.activateTab = function (index) {
        this.foundation.activateTab(index);
    };
    /**
     * Scrolls the tab at the given index into view
     * @param index THe index of the tab
     */
    MDCTabBar.prototype.scrollIntoView = function (index) {
        this.foundation.scrollIntoView(index);
    };
    /**
     * Returns all the tab elements in a nice clean array
     */
    MDCTabBar.prototype.getTabElements_ = function () {
        return [].slice.call(this.root.querySelectorAll(strings$4.TAB_SELECTOR));
    };
    /**
     * Instantiates tab components on all child tab elements
     */
    MDCTabBar.prototype.instantiateTabs_ = function (tabFactory) {
        return this.getTabElements_().map(function (el) {
            el.id = el.id || "mdc-tab-" + ++tabIdCounter;
            return tabFactory(el);
        });
    };
    /**
     * Instantiates tab scroller component on the child tab scroller element
     */
    MDCTabBar.prototype.instantiateTabScroller_ = function (tabScrollerFactory) {
        var tabScrollerElement = this.root.querySelector(strings$4.TAB_SCROLLER_SELECTOR);
        if (tabScrollerElement) {
            return tabScrollerFactory(tabScrollerElement);
        }
        return null;
    };
    return MDCTabBar;
}(MDCComponent));

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$3 = {
    ROOT: 'mdc-text-field-character-counter',
};
var strings$3 = {
    ROOT_SELECTOR: "." + cssClasses$3.ROOT,
};

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextFieldCharacterCounterFoundation = /** @class */ (function (_super) {
    __extends(MDCTextFieldCharacterCounterFoundation, _super);
    function MDCTextFieldCharacterCounterFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCTextFieldCharacterCounterFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCTextFieldCharacterCounterFoundation, "cssClasses", {
        get: function () {
            return cssClasses$3;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldCharacterCounterFoundation, "strings", {
        get: function () {
            return strings$3;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldCharacterCounterFoundation, "defaultAdapter", {
        /**
         * See {@link MDCTextFieldCharacterCounterAdapter} for typing information on parameters and return types.
         */
        get: function () {
            return {
                setContent: function () { return undefined; },
            };
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldCharacterCounterFoundation.prototype.setCounterValue = function (currentLength, maxLength) {
        currentLength = Math.min(currentLength, maxLength);
        this.adapter.setContent(currentLength + " / " + maxLength);
    };
    return MDCTextFieldCharacterCounterFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextFieldCharacterCounter = /** @class */ (function (_super) {
    __extends(MDCTextFieldCharacterCounter, _super);
    function MDCTextFieldCharacterCounter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTextFieldCharacterCounter.attachTo = function (root) {
        return new MDCTextFieldCharacterCounter(root);
    };
    Object.defineProperty(MDCTextFieldCharacterCounter.prototype, "foundationForTextField", {
        // Provided for access by MDCTextField component
        get: function () {
            return this.foundation;
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldCharacterCounter.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        var adapter = {
            setContent: function (content) {
                _this.root.textContent = content;
            },
        };
        return new MDCTextFieldCharacterCounterFoundation(adapter);
    };
    return MDCTextFieldCharacterCounter;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings$2 = {
    ARIA_CONTROLS: 'aria-controls',
    INPUT_SELECTOR: '.mdc-text-field__input',
    LABEL_SELECTOR: '.mdc-floating-label',
    LEADING_ICON_SELECTOR: '.mdc-text-field__icon--leading',
    LINE_RIPPLE_SELECTOR: '.mdc-line-ripple',
    OUTLINE_SELECTOR: '.mdc-notched-outline',
    PREFIX_SELECTOR: '.mdc-text-field__affix--prefix',
    SUFFIX_SELECTOR: '.mdc-text-field__affix--suffix',
    TRAILING_ICON_SELECTOR: '.mdc-text-field__icon--trailing'
};
var cssClasses$2 = {
    DISABLED: 'mdc-text-field--disabled',
    FOCUSED: 'mdc-text-field--focused',
    FULLWIDTH: 'mdc-text-field--fullwidth',
    HELPER_LINE: 'mdc-text-field-helper-line',
    INVALID: 'mdc-text-field--invalid',
    LABEL_FLOATING: 'mdc-text-field--label-floating',
    NO_LABEL: 'mdc-text-field--no-label',
    OUTLINED: 'mdc-text-field--outlined',
    ROOT: 'mdc-text-field',
    TEXTAREA: 'mdc-text-field--textarea',
    WITH_LEADING_ICON: 'mdc-text-field--with-leading-icon',
    WITH_TRAILING_ICON: 'mdc-text-field--with-trailing-icon',
};
var numbers = {
    LABEL_SCALE: 0.75,
};
/**
 * Whitelist based off of https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/Constraint_validation
 * under the "Validation-related attributes" section.
 */
var VALIDATION_ATTR_WHITELIST = [
    'pattern', 'min', 'max', 'required', 'step', 'minlength', 'maxlength',
];
/**
 * Label should always float for these types as they show some UI even if value is empty.
 */
var ALWAYS_FLOAT_TYPES = [
    'color', 'date', 'datetime-local', 'month', 'range', 'time', 'week',
];

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var POINTERDOWN_EVENTS = ['mousedown', 'touchstart'];
var INTERACTION_EVENTS$1 = ['click', 'keydown'];
var MDCTextFieldFoundation = /** @class */ (function (_super) {
    __extends(MDCTextFieldFoundation, _super);
    /**
     * @param adapter
     * @param foundationMap Map from subcomponent names to their subfoundations.
     */
    function MDCTextFieldFoundation(adapter, foundationMap) {
        if (foundationMap === void 0) { foundationMap = {}; }
        var _this = _super.call(this, __assign(__assign({}, MDCTextFieldFoundation.defaultAdapter), adapter)) || this;
        _this.isFocused_ = false;
        _this.receivedUserInput_ = false;
        _this.isValid_ = true;
        _this.useNativeValidation_ = true;
        _this.helperText_ = foundationMap.helperText;
        _this.characterCounter_ = foundationMap.characterCounter;
        _this.leadingIcon_ = foundationMap.leadingIcon;
        _this.trailingIcon_ = foundationMap.trailingIcon;
        _this.inputFocusHandler_ = function () { return _this.activateFocus(); };
        _this.inputBlurHandler_ = function () { return _this.deactivateFocus(); };
        _this.inputInputHandler_ = function () { return _this.handleInput(); };
        _this.setPointerXOffset_ = function (evt) { return _this.setTransformOrigin(evt); };
        _this.textFieldInteractionHandler_ = function () { return _this.handleTextFieldInteraction(); };
        _this.validationAttributeChangeHandler_ = function (attributesList) { return _this.handleValidationAttributeChange(attributesList); };
        return _this;
    }
    Object.defineProperty(MDCTextFieldFoundation, "cssClasses", {
        get: function () {
            return cssClasses$2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation, "strings", {
        get: function () {
            return strings$2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation, "numbers", {
        get: function () {
            return numbers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation.prototype, "shouldAlwaysFloat_", {
        get: function () {
            var type = this.getNativeInput_().type;
            return ALWAYS_FLOAT_TYPES.indexOf(type) >= 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation.prototype, "shouldFloat", {
        get: function () {
            return this.shouldAlwaysFloat_ || this.isFocused_ || !!this.getValue() || this.isBadInput_();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation.prototype, "shouldShake", {
        get: function () {
            return !this.isFocused_ && !this.isValid() && !!this.getValue();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldFoundation, "defaultAdapter", {
        /**
         * See {@link MDCTextFieldAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return true; },
                registerTextFieldInteractionHandler: function () { return undefined; },
                deregisterTextFieldInteractionHandler: function () { return undefined; },
                registerInputInteractionHandler: function () { return undefined; },
                deregisterInputInteractionHandler: function () { return undefined; },
                registerValidationAttributeChangeHandler: function () { return new MutationObserver(function () { return undefined; }); },
                deregisterValidationAttributeChangeHandler: function () { return undefined; },
                getNativeInput: function () { return null; },
                isFocused: function () { return false; },
                activateLineRipple: function () { return undefined; },
                deactivateLineRipple: function () { return undefined; },
                setLineRippleTransformOrigin: function () { return undefined; },
                shakeLabel: function () { return undefined; },
                floatLabel: function () { return undefined; },
                setLabelRequired: function () { return undefined; },
                hasLabel: function () { return false; },
                getLabelWidth: function () { return 0; },
                hasOutline: function () { return false; },
                notchOutline: function () { return undefined; },
                closeOutline: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldFoundation.prototype.init = function () {
        var _this = this;
        if (this.adapter.hasLabel() && this.getNativeInput_().required) {
            this.adapter.setLabelRequired(true);
        }
        if (this.adapter.isFocused()) {
            this.inputFocusHandler_();
        }
        else if (this.adapter.hasLabel() && this.shouldFloat) {
            this.notchOutline(true);
            this.adapter.floatLabel(true);
            this.styleFloating_(true);
        }
        this.adapter.registerInputInteractionHandler('focus', this.inputFocusHandler_);
        this.adapter.registerInputInteractionHandler('blur', this.inputBlurHandler_);
        this.adapter.registerInputInteractionHandler('input', this.inputInputHandler_);
        POINTERDOWN_EVENTS.forEach(function (evtType) {
            _this.adapter.registerInputInteractionHandler(evtType, _this.setPointerXOffset_);
        });
        INTERACTION_EVENTS$1.forEach(function (evtType) {
            _this.adapter.registerTextFieldInteractionHandler(evtType, _this.textFieldInteractionHandler_);
        });
        this.validationObserver_ =
            this.adapter.registerValidationAttributeChangeHandler(this.validationAttributeChangeHandler_);
        this.setCharacterCounter_(this.getValue().length);
    };
    MDCTextFieldFoundation.prototype.destroy = function () {
        var _this = this;
        this.adapter.deregisterInputInteractionHandler('focus', this.inputFocusHandler_);
        this.adapter.deregisterInputInteractionHandler('blur', this.inputBlurHandler_);
        this.adapter.deregisterInputInteractionHandler('input', this.inputInputHandler_);
        POINTERDOWN_EVENTS.forEach(function (evtType) {
            _this.adapter.deregisterInputInteractionHandler(evtType, _this.setPointerXOffset_);
        });
        INTERACTION_EVENTS$1.forEach(function (evtType) {
            _this.adapter.deregisterTextFieldInteractionHandler(evtType, _this.textFieldInteractionHandler_);
        });
        this.adapter.deregisterValidationAttributeChangeHandler(this.validationObserver_);
    };
    /**
     * Handles user interactions with the Text Field.
     */
    MDCTextFieldFoundation.prototype.handleTextFieldInteraction = function () {
        var nativeInput = this.adapter.getNativeInput();
        if (nativeInput && nativeInput.disabled) {
            return;
        }
        this.receivedUserInput_ = true;
    };
    /**
     * Handles validation attribute changes
     */
    MDCTextFieldFoundation.prototype.handleValidationAttributeChange = function (attributesList) {
        var _this = this;
        attributesList.some(function (attributeName) {
            if (VALIDATION_ATTR_WHITELIST.indexOf(attributeName) > -1) {
                _this.styleValidity_(true);
                _this.adapter.setLabelRequired(_this.getNativeInput_().required);
                return true;
            }
            return false;
        });
        if (attributesList.indexOf('maxlength') > -1) {
            this.setCharacterCounter_(this.getValue().length);
        }
    };
    /**
     * Opens/closes the notched outline.
     */
    MDCTextFieldFoundation.prototype.notchOutline = function (openNotch) {
        if (!this.adapter.hasOutline()) {
            return;
        }
        if (openNotch) {
            var labelWidth = this.adapter.getLabelWidth() * numbers.LABEL_SCALE;
            this.adapter.notchOutline(labelWidth);
        }
        else {
            this.adapter.closeOutline();
        }
    };
    /**
     * Activates the text field focus state.
     */
    MDCTextFieldFoundation.prototype.activateFocus = function () {
        this.isFocused_ = true;
        this.styleFocused_(this.isFocused_);
        this.adapter.activateLineRipple();
        if (this.adapter.hasLabel()) {
            this.notchOutline(this.shouldFloat);
            this.adapter.floatLabel(this.shouldFloat);
            this.styleFloating_(this.shouldFloat);
            this.adapter.shakeLabel(this.shouldShake);
        }
        if (this.helperText_) {
            this.helperText_.showToScreenReader();
        }
    };
    /**
     * Sets the line ripple's transform origin, so that the line ripple activate
     * animation will animate out from the user's click location.
     */
    MDCTextFieldFoundation.prototype.setTransformOrigin = function (evt) {
        if (this.isDisabled() || this.adapter.hasOutline()) {
            return;
        }
        var touches = evt.touches;
        var targetEvent = touches ? touches[0] : evt;
        var targetClientRect = targetEvent.target.getBoundingClientRect();
        var normalizedX = targetEvent.clientX - targetClientRect.left;
        this.adapter.setLineRippleTransformOrigin(normalizedX);
    };
    /**
     * Handles input change of text input and text area.
     */
    MDCTextFieldFoundation.prototype.handleInput = function () {
        this.autoCompleteFocus();
        this.setCharacterCounter_(this.getValue().length);
    };
    /**
     * Activates the Text Field's focus state in cases when the input value
     * changes without user input (e.g. programmatically).
     */
    MDCTextFieldFoundation.prototype.autoCompleteFocus = function () {
        if (!this.receivedUserInput_) {
            this.activateFocus();
        }
    };
    /**
     * Deactivates the Text Field's focus state.
     */
    MDCTextFieldFoundation.prototype.deactivateFocus = function () {
        this.isFocused_ = false;
        this.adapter.deactivateLineRipple();
        var isValid = this.isValid();
        this.styleValidity_(isValid);
        this.styleFocused_(this.isFocused_);
        if (this.adapter.hasLabel()) {
            this.notchOutline(this.shouldFloat);
            this.adapter.floatLabel(this.shouldFloat);
            this.styleFloating_(this.shouldFloat);
            this.adapter.shakeLabel(this.shouldShake);
        }
        if (!this.shouldFloat) {
            this.receivedUserInput_ = false;
        }
    };
    MDCTextFieldFoundation.prototype.getValue = function () {
        return this.getNativeInput_().value;
    };
    /**
     * @param value The value to set on the input Element.
     */
    MDCTextFieldFoundation.prototype.setValue = function (value) {
        // Prevent Safari from moving the caret to the end of the input when the value has not changed.
        if (this.getValue() !== value) {
            this.getNativeInput_().value = value;
        }
        this.setCharacterCounter_(value.length);
        var isValid = this.isValid();
        this.styleValidity_(isValid);
        if (this.adapter.hasLabel()) {
            this.notchOutline(this.shouldFloat);
            this.adapter.floatLabel(this.shouldFloat);
            this.styleFloating_(this.shouldFloat);
            this.adapter.shakeLabel(this.shouldShake);
        }
    };
    /**
     * @return The custom validity state, if set; otherwise, the result of a native validity check.
     */
    MDCTextFieldFoundation.prototype.isValid = function () {
        return this.useNativeValidation_
            ? this.isNativeInputValid_() : this.isValid_;
    };
    /**
     * @param isValid Sets the custom validity state of the Text Field.
     */
    MDCTextFieldFoundation.prototype.setValid = function (isValid) {
        this.isValid_ = isValid;
        this.styleValidity_(isValid);
        var shouldShake = !isValid && !this.isFocused_ && !!this.getValue();
        if (this.adapter.hasLabel()) {
            this.adapter.shakeLabel(shouldShake);
        }
    };
    /**
     * Enables or disables the use of native validation. Use this for custom validation.
     * @param useNativeValidation Set this to false to ignore native input validation.
     */
    MDCTextFieldFoundation.prototype.setUseNativeValidation = function (useNativeValidation) {
        this.useNativeValidation_ = useNativeValidation;
    };
    MDCTextFieldFoundation.prototype.isDisabled = function () {
        return this.getNativeInput_().disabled;
    };
    /**
     * @param disabled Sets the text-field disabled or enabled.
     */
    MDCTextFieldFoundation.prototype.setDisabled = function (disabled) {
        this.getNativeInput_().disabled = disabled;
        this.styleDisabled_(disabled);
    };
    /**
     * @param content Sets the content of the helper text.
     */
    MDCTextFieldFoundation.prototype.setHelperTextContent = function (content) {
        if (this.helperText_) {
            this.helperText_.setContent(content);
        }
    };
    /**
     * Sets the aria label of the leading icon.
     */
    MDCTextFieldFoundation.prototype.setLeadingIconAriaLabel = function (label) {
        if (this.leadingIcon_) {
            this.leadingIcon_.setAriaLabel(label);
        }
    };
    /**
     * Sets the text content of the leading icon.
     */
    MDCTextFieldFoundation.prototype.setLeadingIconContent = function (content) {
        if (this.leadingIcon_) {
            this.leadingIcon_.setContent(content);
        }
    };
    /**
     * Sets the aria label of the trailing icon.
     */
    MDCTextFieldFoundation.prototype.setTrailingIconAriaLabel = function (label) {
        if (this.trailingIcon_) {
            this.trailingIcon_.setAriaLabel(label);
        }
    };
    /**
     * Sets the text content of the trailing icon.
     */
    MDCTextFieldFoundation.prototype.setTrailingIconContent = function (content) {
        if (this.trailingIcon_) {
            this.trailingIcon_.setContent(content);
        }
    };
    /**
     * Sets character counter values that shows characters used and the total character limit.
     */
    MDCTextFieldFoundation.prototype.setCharacterCounter_ = function (currentLength) {
        if (!this.characterCounter_) {
            return;
        }
        var maxLength = this.getNativeInput_().maxLength;
        if (maxLength === -1) {
            throw new Error('MDCTextFieldFoundation: Expected maxlength html property on text input or textarea.');
        }
        this.characterCounter_.setCounterValue(currentLength, maxLength);
    };
    /**
     * @return True if the Text Field input fails in converting the user-supplied value.
     */
    MDCTextFieldFoundation.prototype.isBadInput_ = function () {
        // The badInput property is not supported in IE 11 💩.
        return this.getNativeInput_().validity.badInput || false;
    };
    /**
     * @return The result of native validity checking (ValidityState.valid).
     */
    MDCTextFieldFoundation.prototype.isNativeInputValid_ = function () {
        return this.getNativeInput_().validity.valid;
    };
    /**
     * Styles the component based on the validity state.
     */
    MDCTextFieldFoundation.prototype.styleValidity_ = function (isValid) {
        var INVALID = MDCTextFieldFoundation.cssClasses.INVALID;
        if (isValid) {
            this.adapter.removeClass(INVALID);
        }
        else {
            this.adapter.addClass(INVALID);
        }
        if (this.helperText_) {
            this.helperText_.setValidity(isValid);
        }
    };
    /**
     * Styles the component based on the focused state.
     */
    MDCTextFieldFoundation.prototype.styleFocused_ = function (isFocused) {
        var FOCUSED = MDCTextFieldFoundation.cssClasses.FOCUSED;
        if (isFocused) {
            this.adapter.addClass(FOCUSED);
        }
        else {
            this.adapter.removeClass(FOCUSED);
        }
    };
    /**
     * Styles the component based on the disabled state.
     */
    MDCTextFieldFoundation.prototype.styleDisabled_ = function (isDisabled) {
        var _a = MDCTextFieldFoundation.cssClasses, DISABLED = _a.DISABLED, INVALID = _a.INVALID;
        if (isDisabled) {
            this.adapter.addClass(DISABLED);
            this.adapter.removeClass(INVALID);
        }
        else {
            this.adapter.removeClass(DISABLED);
        }
        if (this.leadingIcon_) {
            this.leadingIcon_.setDisabled(isDisabled);
        }
        if (this.trailingIcon_) {
            this.trailingIcon_.setDisabled(isDisabled);
        }
    };
    /**
     * Styles the component based on the label floating state.
     */
    MDCTextFieldFoundation.prototype.styleFloating_ = function (isFloating) {
        var LABEL_FLOATING = MDCTextFieldFoundation.cssClasses.LABEL_FLOATING;
        if (isFloating) {
            this.adapter.addClass(LABEL_FLOATING);
        }
        else {
            this.adapter.removeClass(LABEL_FLOATING);
        }
    };
    /**
     * @return The native text input element from the host environment, or an object with the same shape for unit tests.
     */
    MDCTextFieldFoundation.prototype.getNativeInput_ = function () {
        // this.adapter may be undefined in foundation unit tests. This happens when testdouble is creating a mock object
        // and invokes the shouldShake/shouldFloat getters (which in turn call getValue(), which calls this method) before
        // init() has been called from the MDCTextField constructor. To work around that issue, we return a dummy object.
        var nativeInput = this.adapter ? this.adapter.getNativeInput() : null;
        return nativeInput || {
            disabled: false,
            maxLength: -1,
            required: false,
            type: 'input',
            validity: {
                badInput: false,
                valid: true,
            },
            value: '',
        };
    };
    return MDCTextFieldFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var cssClasses$1 = {
    HELPER_TEXT_PERSISTENT: 'mdc-text-field-helper-text--persistent',
    HELPER_TEXT_VALIDATION_MSG: 'mdc-text-field-helper-text--validation-msg',
    ROOT: 'mdc-text-field-helper-text',
};
var strings$1 = {
    ARIA_HIDDEN: 'aria-hidden',
    ROLE: 'role',
    ROOT_SELECTOR: "." + cssClasses$1.ROOT,
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextFieldHelperTextFoundation = /** @class */ (function (_super) {
    __extends(MDCTextFieldHelperTextFoundation, _super);
    function MDCTextFieldHelperTextFoundation(adapter) {
        return _super.call(this, __assign(__assign({}, MDCTextFieldHelperTextFoundation.defaultAdapter), adapter)) || this;
    }
    Object.defineProperty(MDCTextFieldHelperTextFoundation, "cssClasses", {
        get: function () {
            return cssClasses$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldHelperTextFoundation, "strings", {
        get: function () {
            return strings$1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldHelperTextFoundation, "defaultAdapter", {
        /**
         * See {@link MDCTextFieldHelperTextAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                addClass: function () { return undefined; },
                removeClass: function () { return undefined; },
                hasClass: function () { return false; },
                setAttr: function () { return undefined; },
                removeAttr: function () { return undefined; },
                setContent: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Sets the content of the helper text field.
     */
    MDCTextFieldHelperTextFoundation.prototype.setContent = function (content) {
        this.adapter.setContent(content);
    };
    /**
     * @param isPersistent Sets the persistency of the helper text.
     */
    MDCTextFieldHelperTextFoundation.prototype.setPersistent = function (isPersistent) {
        if (isPersistent) {
            this.adapter.addClass(cssClasses$1.HELPER_TEXT_PERSISTENT);
        }
        else {
            this.adapter.removeClass(cssClasses$1.HELPER_TEXT_PERSISTENT);
        }
    };
    /**
     * @param isValidation True to make the helper text act as an error validation message.
     */
    MDCTextFieldHelperTextFoundation.prototype.setValidation = function (isValidation) {
        if (isValidation) {
            this.adapter.addClass(cssClasses$1.HELPER_TEXT_VALIDATION_MSG);
        }
        else {
            this.adapter.removeClass(cssClasses$1.HELPER_TEXT_VALIDATION_MSG);
        }
    };
    /**
     * Makes the helper text visible to the screen reader.
     */
    MDCTextFieldHelperTextFoundation.prototype.showToScreenReader = function () {
        this.adapter.removeAttr(strings$1.ARIA_HIDDEN);
    };
    /**
     * Sets the validity of the helper text based on the input validity.
     */
    MDCTextFieldHelperTextFoundation.prototype.setValidity = function (inputIsValid) {
        var helperTextIsPersistent = this.adapter.hasClass(cssClasses$1.HELPER_TEXT_PERSISTENT);
        var helperTextIsValidationMsg = this.adapter.hasClass(cssClasses$1.HELPER_TEXT_VALIDATION_MSG);
        var validationMsgNeedsDisplay = helperTextIsValidationMsg && !inputIsValid;
        if (validationMsgNeedsDisplay) {
            this.adapter.setAttr(strings$1.ROLE, 'alert');
        }
        else {
            this.adapter.removeAttr(strings$1.ROLE);
        }
        if (!helperTextIsPersistent && !validationMsgNeedsDisplay) {
            this.hide_();
        }
    };
    /**
     * Hides the help text from screen readers.
     */
    MDCTextFieldHelperTextFoundation.prototype.hide_ = function () {
        this.adapter.setAttr(strings$1.ARIA_HIDDEN, 'true');
    };
    return MDCTextFieldHelperTextFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextFieldHelperText = /** @class */ (function (_super) {
    __extends(MDCTextFieldHelperText, _super);
    function MDCTextFieldHelperText() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTextFieldHelperText.attachTo = function (root) {
        return new MDCTextFieldHelperText(root);
    };
    Object.defineProperty(MDCTextFieldHelperText.prototype, "foundationForTextField", {
        // Provided for access by MDCTextField component
        get: function () {
            return this.foundation;
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldHelperText.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            setAttr: function (attr, value) { return _this.root.setAttribute(attr, value); },
            removeAttr: function (attr) { return _this.root.removeAttribute(attr); },
            setContent: function (content) {
                _this.root.textContent = content;
            },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCTextFieldHelperTextFoundation(adapter);
    };
    return MDCTextFieldHelperText;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var strings = {
    ICON_EVENT: 'MDCTextField:icon',
    ICON_ROLE: 'button',
};
var cssClasses = {
    ROOT: 'mdc-text-field__icon',
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var INTERACTION_EVENTS = ['click', 'keydown'];
var MDCTextFieldIconFoundation = /** @class */ (function (_super) {
    __extends(MDCTextFieldIconFoundation, _super);
    function MDCTextFieldIconFoundation(adapter) {
        var _this = _super.call(this, __assign(__assign({}, MDCTextFieldIconFoundation.defaultAdapter), adapter)) || this;
        _this.savedTabIndex_ = null;
        _this.interactionHandler_ = function (evt) { return _this.handleInteraction(evt); };
        return _this;
    }
    Object.defineProperty(MDCTextFieldIconFoundation, "strings", {
        get: function () {
            return strings;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldIconFoundation, "cssClasses", {
        get: function () {
            return cssClasses;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextFieldIconFoundation, "defaultAdapter", {
        /**
         * See {@link MDCTextFieldIconAdapter} for typing information on parameters and return types.
         */
        get: function () {
            // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
            return {
                getAttr: function () { return null; },
                setAttr: function () { return undefined; },
                removeAttr: function () { return undefined; },
                setContent: function () { return undefined; },
                registerInteractionHandler: function () { return undefined; },
                deregisterInteractionHandler: function () { return undefined; },
                notifyIconAction: function () { return undefined; },
            };
            // tslint:enable:object-literal-sort-keys
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldIconFoundation.prototype.init = function () {
        var _this = this;
        this.savedTabIndex_ = this.adapter.getAttr('tabindex');
        INTERACTION_EVENTS.forEach(function (evtType) {
            _this.adapter.registerInteractionHandler(evtType, _this.interactionHandler_);
        });
    };
    MDCTextFieldIconFoundation.prototype.destroy = function () {
        var _this = this;
        INTERACTION_EVENTS.forEach(function (evtType) {
            _this.adapter.deregisterInteractionHandler(evtType, _this.interactionHandler_);
        });
    };
    MDCTextFieldIconFoundation.prototype.setDisabled = function (disabled) {
        if (!this.savedTabIndex_) {
            return;
        }
        if (disabled) {
            this.adapter.setAttr('tabindex', '-1');
            this.adapter.removeAttr('role');
        }
        else {
            this.adapter.setAttr('tabindex', this.savedTabIndex_);
            this.adapter.setAttr('role', strings.ICON_ROLE);
        }
    };
    MDCTextFieldIconFoundation.prototype.setAriaLabel = function (label) {
        this.adapter.setAttr('aria-label', label);
    };
    MDCTextFieldIconFoundation.prototype.setContent = function (content) {
        this.adapter.setContent(content);
    };
    MDCTextFieldIconFoundation.prototype.handleInteraction = function (evt) {
        var isEnterKey = evt.key === 'Enter' || evt.keyCode === 13;
        if (evt.type === 'click' || isEnterKey) {
            evt.preventDefault(); // stop click from causing host label to focus
            // input
            this.adapter.notifyIconAction();
        }
    };
    return MDCTextFieldIconFoundation;
}(MDCFoundation));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextFieldIcon = /** @class */ (function (_super) {
    __extends(MDCTextFieldIcon, _super);
    function MDCTextFieldIcon() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTextFieldIcon.attachTo = function (root) {
        return new MDCTextFieldIcon(root);
    };
    Object.defineProperty(MDCTextFieldIcon.prototype, "foundationForTextField", {
        // Provided for access by MDCTextField component
        get: function () {
            return this.foundation;
        },
        enumerable: true,
        configurable: true
    });
    MDCTextFieldIcon.prototype.getDefaultFoundation = function () {
        var _this = this;
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = {
            getAttr: function (attr) { return _this.root.getAttribute(attr); },
            setAttr: function (attr, value) { return _this.root.setAttribute(attr, value); },
            removeAttr: function (attr) { return _this.root.removeAttribute(attr); },
            setContent: function (content) {
                _this.root.textContent = content;
            },
            registerInteractionHandler: function (evtType, handler) { return _this.listen(evtType, handler); },
            deregisterInteractionHandler: function (evtType, handler) { return _this.unlisten(evtType, handler); },
            notifyIconAction: function () { return _this.emit(MDCTextFieldIconFoundation.strings.ICON_EVENT, {} /* evtData */, true /* shouldBubble */); },
        };
        // tslint:enable:object-literal-sort-keys
        return new MDCTextFieldIconFoundation(adapter);
    };
    return MDCTextFieldIcon;
}(MDCComponent));

/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var MDCTextField = /** @class */ (function (_super) {
    __extends(MDCTextField, _super);
    function MDCTextField() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MDCTextField.attachTo = function (root) {
        return new MDCTextField(root);
    };
    MDCTextField.prototype.initialize = function (rippleFactory, lineRippleFactory, helperTextFactory, characterCounterFactory, iconFactory, labelFactory, outlineFactory) {
        if (rippleFactory === void 0) { rippleFactory = function (el, foundation) { return new MDCRipple(el, foundation); }; }
        if (lineRippleFactory === void 0) { lineRippleFactory = function (el) { return new MDCLineRipple(el); }; }
        if (helperTextFactory === void 0) { helperTextFactory = function (el) { return new MDCTextFieldHelperText(el); }; }
        if (characterCounterFactory === void 0) { characterCounterFactory = function (el) { return new MDCTextFieldCharacterCounter(el); }; }
        if (iconFactory === void 0) { iconFactory = function (el) { return new MDCTextFieldIcon(el); }; }
        if (labelFactory === void 0) { labelFactory = function (el) { return new MDCFloatingLabel(el); }; }
        if (outlineFactory === void 0) { outlineFactory = function (el) { return new MDCNotchedOutline(el); }; }
        this.input_ = this.root.querySelector(strings$2.INPUT_SELECTOR);
        var labelElement = this.root.querySelector(strings$2.LABEL_SELECTOR);
        this.label_ = labelElement ? labelFactory(labelElement) : null;
        var lineRippleElement = this.root.querySelector(strings$2.LINE_RIPPLE_SELECTOR);
        this.lineRipple_ = lineRippleElement ? lineRippleFactory(lineRippleElement) : null;
        var outlineElement = this.root.querySelector(strings$2.OUTLINE_SELECTOR);
        this.outline_ = outlineElement ? outlineFactory(outlineElement) : null;
        // Helper text
        var helperTextStrings = MDCTextFieldHelperTextFoundation.strings;
        var nextElementSibling = this.root.nextElementSibling;
        var hasHelperLine = (nextElementSibling && nextElementSibling.classList.contains(cssClasses$2.HELPER_LINE));
        var helperTextEl = hasHelperLine && nextElementSibling && nextElementSibling.querySelector(helperTextStrings.ROOT_SELECTOR);
        this.helperText_ = helperTextEl ? helperTextFactory(helperTextEl) : null;
        // Character counter
        var characterCounterStrings = MDCTextFieldCharacterCounterFoundation.strings;
        var characterCounterEl = this.root.querySelector(characterCounterStrings.ROOT_SELECTOR);
        // If character counter is not found in root element search in sibling element.
        if (!characterCounterEl && hasHelperLine && nextElementSibling) {
            characterCounterEl = nextElementSibling.querySelector(characterCounterStrings.ROOT_SELECTOR);
        }
        this.characterCounter_ = characterCounterEl ? characterCounterFactory(characterCounterEl) : null;
        // Leading icon
        var leadingIconEl = this.root.querySelector(strings$2.LEADING_ICON_SELECTOR);
        this.leadingIcon_ = leadingIconEl ? iconFactory(leadingIconEl) : null;
        // Trailing icon
        var trailingIconEl = this.root.querySelector(strings$2.TRAILING_ICON_SELECTOR);
        this.trailingIcon_ = trailingIconEl ? iconFactory(trailingIconEl) : null;
        // Prefix and Suffix
        this.prefix_ = this.root.querySelector(strings$2.PREFIX_SELECTOR);
        this.suffix_ = this.root.querySelector(strings$2.SUFFIX_SELECTOR);
        this.ripple = this.createRipple_(rippleFactory);
    };
    MDCTextField.prototype.destroy = function () {
        if (this.ripple) {
            this.ripple.destroy();
        }
        if (this.lineRipple_) {
            this.lineRipple_.destroy();
        }
        if (this.helperText_) {
            this.helperText_.destroy();
        }
        if (this.characterCounter_) {
            this.characterCounter_.destroy();
        }
        if (this.leadingIcon_) {
            this.leadingIcon_.destroy();
        }
        if (this.trailingIcon_) {
            this.trailingIcon_.destroy();
        }
        if (this.label_) {
            this.label_.destroy();
        }
        if (this.outline_) {
            this.outline_.destroy();
        }
        _super.prototype.destroy.call(this);
    };
    /**
     * Initializes the Text Field's internal state based on the environment's
     * state.
     */
    MDCTextField.prototype.initialSyncWithDOM = function () {
        this.disabled = this.input_.disabled;
    };
    Object.defineProperty(MDCTextField.prototype, "value", {
        get: function () {
            return this.foundation.getValue();
        },
        /**
         * @param value The value to set on the input.
         */
        set: function (value) {
            this.foundation.setValue(value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "disabled", {
        get: function () {
            return this.foundation.isDisabled();
        },
        /**
         * @param disabled Sets the Text Field disabled or enabled.
         */
        set: function (disabled) {
            this.foundation.setDisabled(disabled);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "valid", {
        get: function () {
            return this.foundation.isValid();
        },
        /**
         * @param valid Sets the Text Field valid or invalid.
         */
        set: function (valid) {
            this.foundation.setValid(valid);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "required", {
        get: function () {
            return this.input_.required;
        },
        /**
         * @param required Sets the Text Field to required.
         */
        set: function (required) {
            this.input_.required = required;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "pattern", {
        get: function () {
            return this.input_.pattern;
        },
        /**
         * @param pattern Sets the input element's validation pattern.
         */
        set: function (pattern) {
            this.input_.pattern = pattern;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "minLength", {
        get: function () {
            return this.input_.minLength;
        },
        /**
         * @param minLength Sets the input element's minLength.
         */
        set: function (minLength) {
            this.input_.minLength = minLength;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "maxLength", {
        get: function () {
            return this.input_.maxLength;
        },
        /**
         * @param maxLength Sets the input element's maxLength.
         */
        set: function (maxLength) {
            // Chrome throws exception if maxLength is set to a value less than zero
            if (maxLength < 0) {
                this.input_.removeAttribute('maxLength');
            }
            else {
                this.input_.maxLength = maxLength;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "min", {
        get: function () {
            return this.input_.min;
        },
        /**
         * @param min Sets the input element's min.
         */
        set: function (min) {
            this.input_.min = min;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "max", {
        get: function () {
            return this.input_.max;
        },
        /**
         * @param max Sets the input element's max.
         */
        set: function (max) {
            this.input_.max = max;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "step", {
        get: function () {
            return this.input_.step;
        },
        /**
         * @param step Sets the input element's step.
         */
        set: function (step) {
            this.input_.step = step;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "helperTextContent", {
        /**
         * Sets the helper text element content.
         */
        set: function (content) {
            this.foundation.setHelperTextContent(content);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "leadingIconAriaLabel", {
        /**
         * Sets the aria label of the leading icon.
         */
        set: function (label) {
            this.foundation.setLeadingIconAriaLabel(label);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "leadingIconContent", {
        /**
         * Sets the text content of the leading icon.
         */
        set: function (content) {
            this.foundation.setLeadingIconContent(content);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "trailingIconAriaLabel", {
        /**
         * Sets the aria label of the trailing icon.
         */
        set: function (label) {
            this.foundation.setTrailingIconAriaLabel(label);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "trailingIconContent", {
        /**
         * Sets the text content of the trailing icon.
         */
        set: function (content) {
            this.foundation.setTrailingIconContent(content);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "useNativeValidation", {
        /**
         * Enables or disables the use of native validation. Use this for custom validation.
         * @param useNativeValidation Set this to false to ignore native input validation.
         */
        set: function (useNativeValidation) {
            this.foundation.setUseNativeValidation(useNativeValidation);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "prefixText", {
        /**
         * Gets the text content of the prefix, or null if it does not exist.
         */
        get: function () {
            return this.prefix_ ? this.prefix_.textContent : null;
        },
        /**
         * Sets the text content of the prefix, if it exists.
         */
        set: function (prefixText) {
            if (this.prefix_) {
                this.prefix_.textContent = prefixText;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MDCTextField.prototype, "suffixText", {
        /**
         * Gets the text content of the suffix, or null if it does not exist.
         */
        get: function () {
            return this.suffix_ ? this.suffix_.textContent : null;
        },
        /**
         * Sets the text content of the suffix, if it exists.
         */
        set: function (suffixText) {
            if (this.suffix_) {
                this.suffix_.textContent = suffixText;
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Focuses the input element.
     */
    MDCTextField.prototype.focus = function () {
        this.input_.focus();
    };
    /**
     * Recomputes the outline SVG path for the outline element.
     */
    MDCTextField.prototype.layout = function () {
        var openNotch = this.foundation.shouldFloat;
        this.foundation.notchOutline(openNotch);
    };
    MDCTextField.prototype.getDefaultFoundation = function () {
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = __assign(__assign(__assign(__assign(__assign({}, this.getRootAdapterMethods_()), this.getInputAdapterMethods_()), this.getLabelAdapterMethods_()), this.getLineRippleAdapterMethods_()), this.getOutlineAdapterMethods_());
        // tslint:enable:object-literal-sort-keys
        return new MDCTextFieldFoundation(adapter, this.getFoundationMap_());
    };
    MDCTextField.prototype.getRootAdapterMethods_ = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            addClass: function (className) { return _this.root.classList.add(className); },
            removeClass: function (className) { return _this.root.classList.remove(className); },
            hasClass: function (className) { return _this.root.classList.contains(className); },
            registerTextFieldInteractionHandler: function (evtType, handler) { return _this.listen(evtType, handler); },
            deregisterTextFieldInteractionHandler: function (evtType, handler) { return _this.unlisten(evtType, handler); },
            registerValidationAttributeChangeHandler: function (handler) {
                var getAttributesList = function (mutationsList) {
                    return mutationsList
                        .map(function (mutation) { return mutation.attributeName; })
                        .filter(function (attributeName) { return attributeName; });
                };
                var observer = new MutationObserver(function (mutationsList) { return handler(getAttributesList(mutationsList)); });
                var config = { attributes: true };
                observer.observe(_this.input_, config);
                return observer;
            },
            deregisterValidationAttributeChangeHandler: function (observer) { return observer.disconnect(); },
        };
        // tslint:enable:object-literal-sort-keys
    };
    MDCTextField.prototype.getInputAdapterMethods_ = function () {
        var _this = this;
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        return {
            getNativeInput: function () { return _this.input_; },
            isFocused: function () { return document.activeElement === _this.input_; },
            registerInputInteractionHandler: function (evtType, handler) {
                return _this.input_.addEventListener(evtType, handler, applyPassive());
            },
            deregisterInputInteractionHandler: function (evtType, handler) {
                return _this.input_.removeEventListener(evtType, handler, applyPassive());
            },
        };
        // tslint:enable:object-literal-sort-keys
    };
    MDCTextField.prototype.getLabelAdapterMethods_ = function () {
        var _this = this;
        return {
            floatLabel: function (shouldFloat) { return _this.label_ && _this.label_.float(shouldFloat); },
            getLabelWidth: function () { return _this.label_ ? _this.label_.getWidth() : 0; },
            hasLabel: function () { return Boolean(_this.label_); },
            shakeLabel: function (shouldShake) { return _this.label_ && _this.label_.shake(shouldShake); },
            setLabelRequired: function (isRequired) { return _this.label_ && _this.label_.setRequired(isRequired); },
        };
    };
    MDCTextField.prototype.getLineRippleAdapterMethods_ = function () {
        var _this = this;
        return {
            activateLineRipple: function () {
                if (_this.lineRipple_) {
                    _this.lineRipple_.activate();
                }
            },
            deactivateLineRipple: function () {
                if (_this.lineRipple_) {
                    _this.lineRipple_.deactivate();
                }
            },
            setLineRippleTransformOrigin: function (normalizedX) {
                if (_this.lineRipple_) {
                    _this.lineRipple_.setRippleCenter(normalizedX);
                }
            },
        };
    };
    MDCTextField.prototype.getOutlineAdapterMethods_ = function () {
        var _this = this;
        return {
            closeOutline: function () { return _this.outline_ && _this.outline_.closeNotch(); },
            hasOutline: function () { return Boolean(_this.outline_); },
            notchOutline: function (labelWidth) { return _this.outline_ && _this.outline_.notch(labelWidth); },
        };
    };
    /**
     * @return A map of all subcomponents to subfoundations.
     */
    MDCTextField.prototype.getFoundationMap_ = function () {
        return {
            characterCounter: this.characterCounter_ ?
                this.characterCounter_.foundationForTextField :
                undefined,
            helperText: this.helperText_ ? this.helperText_.foundationForTextField :
                undefined,
            leadingIcon: this.leadingIcon_ ?
                this.leadingIcon_.foundationForTextField :
                undefined,
            trailingIcon: this.trailingIcon_ ?
                this.trailingIcon_.foundationForTextField :
                undefined,
        };
    };
    MDCTextField.prototype.createRipple_ = function (rippleFactory) {
        var _this = this;
        var isTextArea = this.root.classList.contains(cssClasses$2.TEXTAREA);
        var isOutlined = this.root.classList.contains(cssClasses$2.OUTLINED);
        if (isTextArea || isOutlined) {
            return null;
        }
        // DO NOT INLINE this variable. For backward compatibility, foundations take a Partial<MDCFooAdapter>.
        // To ensure we don't accidentally omit any methods, we need a separate, strongly typed adapter variable.
        // tslint:disable:object-literal-sort-keys Methods should be in the same order as the adapter interface.
        var adapter = __assign(__assign({}, MDCRipple.createAdapter(this)), { isSurfaceActive: function () { return matches(_this.input_, ':active'); }, registerInteractionHandler: function (evtType, handler) { return _this.input_.addEventListener(evtType, handler, applyPassive()); }, deregisterInteractionHandler: function (evtType, handler) {
                return _this.input_.removeEventListener(evtType, handler, applyPassive());
            } });
        // tslint:enable:object-literal-sort-keys
        return rippleFactory(this.root, new MDCRippleFoundation(adapter));
    };
    return MDCTextField;
}(MDCComponent));

/**
 * {@link https://material.io/develop/web/components/ripples/}
 * @param {Element} panel
 */
const renderRipples = function(panel) {
  [...panel.querySelectorAll('.mdc-ripple-surface')].forEach(
      MDCRipple.attachTo);
};


/**
 * {@link https://material.io/develop/web/components/buttons/}
 * @param {Element} panel
 */
const renderButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-button')].forEach(el => {
    MDCRipple.attachTo(el);
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
 * @param {Element} panel
 */
const renderFloatingActionButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-fab')].forEach(el => {
    MDCRipple.attachTo(el);
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
 * @param {Element} panel
 */
const renderIconButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-button:not(.mdc-icon-toggle)')].forEach(el => {
    const b = new MDCRipple(el);
    b.unbounded = true;

    this.listen(el, 'click', e => {
      const trg = e.currentTarget;
      const elDataMap = getElDataMap(trg);
      const propageEvent = elDataMap['evpropagate'] || '';

      if (propageEvent.toLowerCase() === "allow") ; else {
        e.stopPropagation();
      }
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
 * @param {Element} panel
 */
const renderIconToggleButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-toggle')].forEach(el => {
    new MDCIconButtonToggle(el);
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

const renderDataTables = function(panel) {
  const checkboxController = "mdc-checkbox__native-control";
  [...panel.querySelectorAll('.mdc-data-table')].forEach(el => {
    const dataTable = new MDCDataTable(el);

    // A flag to indicate that the user wants to select
    // all across all pages.
    dataTable.selectedAllAcrossPages = false;

    dataTable.onSomeSelected = () => {
    };
    dataTable.onNoneSelected = () => {
    };
    dataTable.onAllSelected = () => {
    };
    dataTable.toggleSelectAcrossPages = () => {
      dataTable.selectedAllAcrossPages = !dataTable.selectedAllAcrossPages;
      return dataTable.selectedAllAcrossPages;
    };
    dataTable.setSelectAcrossPages = bool => {
      dataTable.selectedAllAcrossPages = bool;
      return dataTable.selectedAllAcrossPages;
    };
    dataTable.getSelectAcrossPages = () => {
      return dataTable.selectedAllAcrossPages;
    };

    el.dataTable = dataTable;

    const onSelections = e => {
      const selectedRowCount = dataTable.getSelectedRowIds().length;
      if (e.type === 'MDCDataTable:selectedAll') {
        dataTable.onAllSelected();
      } else if (selectedRowCount === 0) {
        dataTable.onNoneSelected();
      } else {
        dataTable.onSomeSelected();
      }
    };

    ['MDCDataTable:rowSelectionChanged',
      'MDCDataTable:selectedAll',
      'MDCDataTable:unselectedAll'
    ].forEach(eventString => {
      this.listen(el, eventString, onSelections);
    });

    [...el.querySelectorAll('.mdc-data-table__row')].forEach(r => {
      this.listen(r, 'click', e => {
        const triggeredElement = e.target;
        if (!triggeredElement.classList.contains(checkboxController)) {
          e.stopPropagation();
          const trg = e.currentTarget;
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href']
          }, elDataMap));
        }
      });
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/tabs/tab-bar/}
 * @param {Element} panel
 */
const renderTabBars = function(panel) {
  [...panel.querySelectorAll('.mdc-tab-bar')].forEach(el => {
    const tbar = new MDCTabBar(el);
    this.listen(el, 'MDCTabBar:activated', e => {
      const trg = tbar.tabList_[e.detail.index].root;
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
 * @param {Element} panel
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
 * @param {Element} panel
 */
const renderChips = function(panel) {
  [...panel.querySelectorAll('.mdc-chip-set')].forEach(el => {
    const chipSet = MDCChipSet.attachTo(el);
    chipSet.listen('MDCChip:interaction', e => {
      const chip = chipSet.chips.find(c => c.id === e.detail.chipId);
      const trg = chip.root;
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
 * @param {Element} panel
 */
const renderMenuSurfaces = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface')].forEach(
      MDCMenuSurface.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/menus/}
 * @param {Element} panel
 */
const renderMenus = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface--anchor:not(.mdc-select__menu)')].forEach(
      menuButtonEl => {
        const menuEl = menuButtonEl.querySelector('.mdc-menu');
        const corner = getElDataMap(menuEl)['corner'] || 'BOTTOM_START';

        // Make the menu
        const menu = new MDCMenu(menuEl);
        menu.setAnchorCorner(Corner[corner]);
        menu.items.forEach(MDCRipple.attachTo);
        menu.quickOpen = false;
        menu.listen('click', e => e.stopPropagation());
        menu.listen('MDCMenu:selected', e => {
          e.stopPropagation();
          const trg = e.detail['item'];
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href'],
          }, elDataMap));
        });

        // Toggle the menu open or closed from the anchor element.
        menuButtonEl.addEventListener('click', e => {
          return menu.open = !menu.open
        });

        if (menuEl.classList.contains('z2-filter-on-keydown')) {
          const reset = () => {
            filterWord = '';
            menu.items.forEach(e => e.classList.remove('hidden_list_item'));
          };
          const nameTargets = [...menu.items].map(e => toLowerCase(
              e.querySelector('.mdc-list-item__text').textContent));
          let filterWord = '';
          const wordCodes = 'abcdefghijklmnopqrstuvwxyz0123456789 -_';
          const filterMenuOnTyping = e => {
            const key = toLowerCase(e.key);
            if (e.defaultPrevented) {
              return; // Do nothing if the event was already processed
            }
            if (wordCodes.includes(key)) {
              filterWord = `${filterWord}${key}`;
            } else if (key === "escape") {
              reset();
            } else if (key === "backspace") {
              filterWord = filterWord.slice(0, -1);
            }
            if (filterWord !== "") {
              nameTargets.forEach((target, i) => {
                if (target.includes(filterWord)) {
                  menu.items[i].classList.remove('hidden_list_item');
                } else {
                  menu.items[i].classList.add('hidden_list_item');
                }
              });
            }
          };
          menu.listen('MDCMenuSurface:closed', e => {
            reset();
            document.removeEventListener(
                'keydown', filterMenuOnTyping, true);
          });
          menu.listen('MDCMenuSurface:opened', e => {
            reset();
            document.addEventListener(
                'keydown', filterMenuOnTyping, true);
          });
        }

      });
};


/**
 * {@link https://material.io/develop/web/components/lists/}
 * @param {Element} panel
 */
const renderLists = function(panel) {
  [...panel.querySelectorAll('.mdc-list:not(.mdc-menu__items)')].forEach(el => {
    const list = new MDCList(el);
    list.listElements.forEach(MDCRipple.attachTo);
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
 * @param {Element} panel
 */
const renderSliders = function(panel) {
  [...panel.querySelectorAll('.mdc-slider')].forEach(el => {
    const slider = new MDCSlider(el);
    const elDataMap = getElDataMap(el);
    const inputEl = el.parentElement.querySelector(`#${elDataMap.inputid}`);
    this.listen(el, 'MDCSlider:change', (e) => {
      inputEl.value = slider.value;
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/linear-progress/}
 * @param {Element} panel
 */
const renderLinearProgress = function(panel) {
  [...panel.querySelectorAll('.mdc-linear-progress')].forEach(el => {
    el.linProg = MDCLinearProgress.attachTo(el);
  });
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/}
 * @param {Element} panel
 */
const renderTextFields = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field')].forEach(
      MDCTextField.attachTo
  );
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/icon/}
 * @param {Element} panel
 */
const renderTextFieldIcons = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field-icon')].forEach(
      MDCTextFieldIcon.attachTo
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
  const menuBuilder = (menuUl, htmSelectField, mdcSelect) => () => {

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

    mdcSelect.layoutOptions();

    // Match the selected indexes, and listen for changes on the MDC component
    // so we can update the real form component.
    try {
      mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;
    } catch (e) {
      console.log("Error:",
          htmSelectField.options.selectedIndex,
          htmSelectField, mdcSelect,
          mdcSelect.selectedIndex, e);
    }
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
    e.querySelector('.mdc-select__menu');
    const htmSelectField = e.querySelector('select');

    // We need to control the position of the menu surface.
    const anchorEl = e.querySelector('.mdc-select__anchor');
    const toolbarEl = panel.querySelector('.tst__toolbar');
    const calcPos = calculatePosition(anchorEl, toolbarEl);

    // Instantiate the MDCSelect component.
    // This adds the elements to the DOM
    const mdcSelect = new MDCSelect(e);

    // We park some accessors on the select field itself
    // This is so that we can manipulate the dropdowns from the outside i.e
    // if you would like the dropdown to dynamically update depending
    // on some other event.
    htmSelectField.buildMenu = menuBuilder(menuUl, htmSelectField, mdcSelect);
    htmSelectField.buildMenu();

    // This fires twice for some reason :(
    mdcSelect.listen('MDCSelect:change', () => {
      htmSelectField.options[mdcSelect.selectedIndex].selected = true;
      htmSelectField.dispatchEvent(new Event('custom:select:change'));
    });

    // Get a handle on the menu component, as we want
    // to listen for when it opens.
    const menu = mdcSelect.menu;
    menu.setFixedPosition(true);

    // Wholly override all css on the menu surface each time it opens.
    menu.listen('MDCMenuSurface:opened', calcPos);
  });

};

/**
 * {@link https://material.io/develop/web/components/input-controls/form-fields/}
 * @param {Element} panel
 */
const renderFormFields = function(panel) {
  [...panel.querySelectorAll(
      '.mdc-form-field:not(.for-radio):not(.for-checkbox)')].forEach(
      MDCFormField.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/input-controls/radio-buttons/}
 * @param {Element} panel
 */
const renderRadioButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-radio')].forEach(ff => {
    const formField = new MDCFormField(ff);
    const radContainerEl = ff.querySelector('.mdc-radio');
    radContainerEl.querySelector(
        'input[type="radio"]').classList.add('mdc-radio__native-control');
    formField.input = new MDCRadio(radContainerEl);
  });
};

/**
 * {@link https://material.io/develop/web/components/input-controls/checkboxes/}
 * @param {Element} panel
 */
const renderCheckBoxes = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-checkbox')].forEach(ff => {
    const cbEl = ff.querySelector('.mdc-checkbox');
    const checkBox = new MDCCheckbox(cbEl);
    const formField = new MDCFormField(ff);
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
   * @param {Function=} opt_callback An optional callback to call before
   * rendering the panel. This is useful for when you only want to attach the
   * new panel to the view right before you render it - meaning the existing
   * panel stays in place on the DOM for the duration of the fetch call.
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
      renderSelectMenus.call(this, panel);
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
      });
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
          const targetEl = panel.querySelector(`#${toggleTarget}`);
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
    };
    const justLog = e => {
      //    console.log(e)
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
      el.addEventListener('dragend', justLog, false);
    }, false);


    //------------------------------------------------------[ Async Populate ]--
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
    [...panel.querySelectorAll('.zoo_async_html')].forEach(
        /**
         * @param {Element} el
         */
        el => {
          const elDataMap = getElDataMap(el);
          const href = elDataMap['href'];
          this.user.fetchAndSplit(href)
              .then(data => {
                el.appendChild(data.html);
                this.parseContent(el);
                this.evalScripts(data.scripts);
                this.evalModules(data.modules);
              });
          const repeat = toNumber(elDataMap['z_interval']);
          if (isNumber(repeat)) {
            this.doOnBeat(() => {
              this.user.fetchAndSplit(href)
                  .then(data => {
                    el.replaceChildren(data.html);
                    this.parseContent(el);
                    this.evalScripts(data.scripts);
                    this.evalModules(data.modules);
                  });
            }, repeat * 60 * 1000);
          }
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
 * @return {Function} Returns true if element is in the viewport
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
              href,
              eventData
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

export { zooy as default };
