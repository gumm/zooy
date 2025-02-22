import {format} from "timeago.js"
import {
  identity,
  isArray,
  isDefAndNotNull,
  isNumber,
  isString,
  pathOr,
  toNumber
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
    year: "2-digit",
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
  return `${da} ${mo} ${ye} ${hr}:${mn}:${sc}`;
}

/**
 * Format a number to a date and time and time-ago string.
 * @param {string|number} v The value to parse
 * @param {string} resultFormat Any of "time|ago", "time", "ago" etc.
 * @param prepend Data to prepend to the value.
 * @returns {`${string}|${string}`|`${string} (${string})`|string}
 */
export const parseMomentAgo = (v, resultFormat = 'both', prepend = undefined) => {
  let ts = v;
  if (isNumber(ts) && ts < 946684800000) {
    ts = ts * 1000;
  } else if (prepend) {
    ts = ts + prepend
  }
  const d = new Date(ts);
  const ago = format(d);
  const time = dateToZooyStdTimeString(d);

  switch (resultFormat) {
    case 'time|ago':
      return `${time}|${ago}`;
    case 'ago':
      return `${ago}`;
    case 'datetime':
    case 'time':
      return `${time}`;
    case 'both':
    case 'ago (time)':
    default:
      return `${ago} (${time})`;
  }

}

/**
 * Parses an obfuscated version of a given string.
 *
 * The function takes a string as input and processes it to mask certain
 * characters with an asterisk ('*') based on specific conditions.
 *
 * @param {string} v The input string to be obfuscated.
 * @returns {string} A new string where characters meeting the defined
 *                   criteria have been replaced by an asterisk ('*').
 */
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

/**
 * A Map object that associates specific keys with parsing functions to 
 * manipulate or format data values.
 *
 * The `parseMap` variable maps string-based keys to functions, where each 
 * function defines a specific way to process or transform the given 
 * value (`v`). The functions may use additional parameters like `el` 
 * (representing an element) and `dataMap` (representing a broader dataset 
 * or configuration) to perform their transformations. The processed value is 
 * then returned by the associated function.
 *
 * Keys and their associated functionality:
 * - `undefined`: Returns the input value unmodified via the `identity` function.
 * - `''`: Passes the value through the `identity` function without transformations.
 * - `class_update_only`: Passes the value through the `identity` function without changes.
 * - `frac_100`: Converts the input value into a percentage between 0 and 100. The result is rounded to two decimal places.
 * - `date_and_time`: Parses the input as a date and time, formats it using `toLocaleString` with specified options.
 * - `date`: Parses the input as a date and formats it using `toLocaleString` with custom date formatting.
 * - `moment_ago`: Parses a relative time representation (e.g., "5 minutes ago") as both ago and datetime format.
 * - `moment_ago_only`: Parses the input as relative time in an "ago" format only, taking timezone from `dataMap`.
 * - `moment_ago_datetime`: Formats the input using the datetime aspect of a "moment ago" parser.
 * - `pretty-json`: Serializes a JavaScript object or value into a human-readable JSON string with 4-space indentation.
 * - `obfuscated`: Processes the value to generate or decipher an obfuscated version of the input.
 * - `linear-progress`: Adjusts the progress value of an associated `linear-progress` element. Progress is computed based on
 *   the input value (`v`) divided by a maximum value (`zpmax`) fetched from `dataMap`. Returns `undefined` if the progress
 *   is successfully updated.
 */
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


/**
 * Parses a string containing key-value definitions into an array of key-value pairs.
 * It is used to add element data properties to elements that were created from
 * the 'templated-array' directive.
 * @example
 *    zoodatapropkv='["propName":"propValue", "p2":"v2",]'
 *    parseDataPropKvDef(zoodatapropkv) 
 *    // -> [["propName","propValue"], ["p2","v2"]]
 * 
 * @param {string} str - The input string to parse, which should be enclosed in delimiters and contain key-value pairs
 * separated by commas. Each key-value pair should be separated by a colon.
 * 
 * @returns {Array.<Array.<string>>} An array of key-value pairs, where each pair is represented as a two-element array
 * with the key and value as strings. Invalid or empty pairs are excluded from the result.
 */
const parseDataPropKvDef = (str) => {
  const cleaned = str.slice(1, -1).trim();
  const pairs = cleaned.split(',').map(pair => pair.trim());
  return pairs.map(pair => {
    const [key, value] = pair.split(':').map(item => item.trim());
    return [key, value];
  }).filter(([key, value]) => key !== '' && value !== '');
}

/**
 * Parses and assigns data properties to an element based on a mapping
 * defined in its dataset and the provided data object.
 *
 * This function retrieves a special data property mapping from the element's
 * dataset, processes the mapping definitions, and updates the element's
 * dataset with properties and their corresponding values found in the
 * provided data object.
 *
 * @param {HTMLElement} el - The target HTML element whose dataset will be updated.
 * @param {Object} data - The source data object used to resolve property values.
 * @returns {HTMLElement} - The updated HTML element with modified dataset properties.
 */
const parseDataProps = (el, data) => {
  const dm = getElDataMap(el);
  delete el.dataset.zoodatapropkv;
  const targetPropDef = dm.zoodatapropkv || '';
  const propDefs = parseDataPropKvDef(targetPropDef);
  propDefs.forEach(([prop, valueAccess]) => {
    el.dataset[prop] = pathOr(undefined, valueAccess.split('.'))(data);
  });
  return el;
}


export const mapDataToEls = (rootEl, json, opt_extendedMap = new Map()) => {

  if (!json) {
    return;
  }

  const merged = new Map([...parseMap, ...opt_extendedMap]);
  [...rootEl.querySelectorAll('[data-zdd],[data-zdd_class_update]')].forEach(el => {
    const dataMap = getElDataMap(el);
    const lldRef = dataMap['zdd'] || '';
    const parseAs = dataMap['zdd_parse_as'];
    const renderEffect = dataMap['zdd_render_effect'] || '';
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
          case 'choice_map':
            // name: '1>blah.hello|2>blee.bing|3>blue.whatnow'
            // If value is 1, add blah and remove all the rest
            name.split('|').filter(e => e !== "").forEach(e => {
              const [keyVal, className] = e.split('>');
              if (keyVal === v + '') {
                el.classList.add.apply(el.classList, className.split('.'))
              } else {
                el.classList.remove.apply(el.classList, className.split('.'))
              }
            });
            break
        }
      }
    }

    if (parseAs === 'templated-array' && isArray(v)) {
      v = v || [];
      const template = el.firstElementChild;
      template.classList.remove('display__none');
      el.replaceChildren(...v.map(e => {
        const clone = template.cloneNode(true);

        parseDataProps(clone, e);
        mapDataToEls(clone, e);
        
        return clone;
      }));
    } else if (isDefAndNotNull(v)) {
      if (renderEffect === 'typewriter') {
        let i = 0;
        const txt = v + units;
        const speed = 5;
        const typeWriter = () => {
          if (i < txt.length) {
            el.innerHTML += txt.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
          }
        }
        el.innerHTML = "";
        typeWriter();
      } else {
        el.innerHTML = v + units
      }
    }


  });
};



