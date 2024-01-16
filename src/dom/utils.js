import {format} from "timeago.js"
import {
  identity,
  isDefAndNotNull,
  isFunction,
  isString,
  isNumber,
  toNumber,
  isArray,
  pathOr
} from "badu";

/**
 * Gets the current value of a check-able input element.
 * @param {Element} el The element.
 * @return {?string} The value of the form element (or null).
 * @private
 */
const getInputChecked_ = function (el) {
  return el.checked ? /** @type {?} */ (el).value : null;
};

/**
 * Gets the current value of a select-one element.
 * @param {Element} el The element.
 * @return {?string} The value of the form element (or null).
 * @private
 */
const getSelectSingle_ = function (el) {
  const selectedIndex = /** @type {!HTMLSelectElement} */ (el).selectedIndex;
  return selectedIndex >= 0 ?
    /** @type {!HTMLSelectElement} */ (el).options[selectedIndex].value :
    null;
};

/**
 * Gets the current value of a select-multiple element.
 * @param {Element} el The element.
 * @return {Array<string>|null} The value of the form element (or null).
 * @private
 */
const getSelectMultiple_ = function (el) {
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
export const getValue = function (el) {
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
 * Converts a set of form elements to an object with form names, as keys,
 * and form values as values.
 * Use like this:
 *    const data = formToJSON(formElement.elements);
 * @param elements
 * @returns {*|(function(*, *): *)}
 */
export const formToJSON = elements => [...elements].reduce((data, element) => {
  data[element.name] = element.value;
  return data;
}, {});


/**
 * Replaces a node in the DOM tree. Will do nothing if `oldNode` has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
export const replaceNode = (newNode, oldNode) => {
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
export const removeNode = node => {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};

/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
export const insertSiblingAfter = (newNode, refNode) => {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};

/**
 * @param {!Node} node
 * @return {boolean}
 */
export const isInPage = node => {
  return (node === document.body) ? false : document.body.contains(node);
};

/**
 * @param {!HTMLElement} el
 * @return {!Array<number>}
 */
export const getPos = el => {
  return [el.offsetLeft, el.offsetTop];
};


/**
 * Make a random RGBA colour string.
 * The alpha channel is 0.5 by default but can be passed in.
 * Useful for debugging.
 * @param {number=} opt_a
 * @return {string}
 */
export const randomColour = opt_a => {
  return [1, 2, 3].map(() => Math.floor(Math.random() * 256) + 1)
    .reduce((p, c) => `${p}${c},`, 'rgba(') + `${opt_a ? opt_a : 0.5}`;
};


export const totalWidth = el => {
  const s = window.getComputedStyle(el);
  const width = el.offsetWidth;
  const margin = parseFloat(s.marginLeft) + parseFloat(s.marginRight);
  const padding = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
  const border = parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth);
  return width + margin - padding + border
};

export const totalHeight = el => {
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
export const evalScripts = comp => arr => {
  arr && Array.from(arr).forEach(s => {
    (function () {
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
export const evalModules = comp => arr => {
  arr && Array.from(arr).forEach(e => {
    (function () {
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
export const splitScripts = data => {
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
export const handleTemplateProm = t => Promise.resolve(splitScripts(t));


export const enableClass = (e, className, bool) => {
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
export const toggleClass = (element, className) => {
  const add = !Array.from(element.classList).includes(className);
  enableClass(element, className, add);
  return add;
};


export const getElDataMap = el => el ? Object.assign({}, el.dataset || {}) : {};


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

export const dtf = new Intl.DateTimeFormat(
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

export const dateToZooyStdTimeString = d => {
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
  ] = dtf.formatToParts(d)
  return `${da} ${mo} ${ye}, ${hr}:${mn}:${sc}`;
}

export const parseMomentAgo = (v, onlyAgo, prepend) => {
  let ts = v;
  if (isNumber(ts) && ts < 946684800000) {
    ts = ts * 1000;
  } else if (prepend) {
    ts = ts + prepend
  }
  const d = new Date(ts);
  const ago = format(d);
  const time = dateToZooyStdTimeString(d);
  if (onlyAgo === 'both') {
    return `${ago} (${time})`
  }
  if (onlyAgo === 'ago') {
    return `${ago}`
  }
  if (onlyAgo === 'datetime') {
    return `${time}`
  }
  return `${ago} (${time})`;
}

const parseObfuscated = v => {
  /**
   * @param {string} s
   * @return {function(number): boolean}
   */
  const tst = s => i => i < s.length - 4;
  const t = tst(v);
  const ob = s => s.split('').map((c, i) => t(i) ? '*' : c).join('');
  return ob(v);
}

export const parseMap = new Map()
  .set(undefined, (v, el, dataMap) => identity(v))
  .set('', (v, el, dataMap) => identity(v))
  .set('class_update_only', (v, el, dataMap) => identity(v))
  .set('frac_100', (v, el, dataMap) => Math.round((v * 100) * 100) / 100)
  .set('date_and_time', (v, el, dataMap) => new Date(v).toLocaleString(undefined, dtFormatter))
  .set('date', (v, el, dataMap) => new Date(v).toLocaleString(undefined, dFormatter))
  .set('moment_ago', (v, el, dataMap) => parseMomentAgo(v, 'both', dataMap['zdd_date_tz'] || void 0))
  .set('moment_ago_only', (v, el, dataMap) => parseMomentAgo(v, 'ago', dataMap['zdd_date_tz'] || void 0))
  .set('moment_ago_datetime', (v, el, dataMap) => parseMomentAgo(v, 'datetime', dataMap['zdd_date_tz'] || void 0))
  .set('pretty-json', (v, el, dataMap) => JSON.stringify(v, null, 4))
  .set('obfuscated', (v, el, dataMap) => parseObfuscated(v))
  .set('linear-progress', (v, el, dataMap) => {
    const max = toNumber(dataMap.zpmax);
    const progress = el.linProg;
    if (max && progress) {
      progress.progress = v / max;
      v = undefined;
    }
    return v;
  })

export const mapDataToEls = (rootEl, json, opt_extendedMap = new Map()) => {

  if (!json) {
    return;
  }

  const merged = new Map([...parseMap, ...opt_extendedMap]);
  [...rootEl.querySelectorAll('[data-zdd]')].forEach(el => {
    const dataMap = getElDataMap(el);
    const lldRef = dataMap['zdd'];
    const parseAs = dataMap['zdd_parse_as'];
    const classUpdate = dataMap['zdd_class_update'];
    let units = dataMap['zdd_units'] || '';
    let v = pathOr(undefined, lldRef.split('.'))(json);

    if (isDefAndNotNull(v)) {
      v = merged.has(parseAs) ? merged.get(parseAs)(v, el, dataMap) : v
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
              e => e.includes(oldClassName)))
            el.classList.add(newClass);
            break;
          case 'remove_on_data':
            el.classList.remove(name);
            break;
        }
      }
    }

    if (parseAs !== 'class_update_only') {
      if (parseAs === 'templated-array' && isArray(v)) {
        v = v || [];
        const template = el.firstElementChild;
        template.classList.remove('display__none');
        el.replaceChildren(...v.map(e => {
          const clone = template.cloneNode(true);
          mapDataToEls(clone, e)
          return clone;
        }));
      } else if (isDefAndNotNull(v)) {
        el.innerHTML = v + units
      }
    }


  });
};



