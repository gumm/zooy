import { isString } from '../../node_modules/badu/src/badu.js'

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
export const getValue = function(el) {
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
 * Returns the form data as a map or an application/x-www-url-encoded
 * string. This doesn't support file inputs.
 * @param {HTMLFormElement} form The form.
 */
export const getFormDataMap = form => {
  const map = new Map();
  [...form.elements].forEach(el => {
    if (  // Make sure we don't include elements that are not part of the form.
    // Some browsers include non-form elements. Check for 'form' property.
    // See http://code.google.com/p/closure-library/issues/detail?id=227
    // and
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#the-input-element
        (el.form !== form) || el.disabled ||
        // HTMLFieldSetElement has a form property but no value.
        el.tagName.toLowerCase() === 'fieldset') {
      return;
    }

    let name = el.name;
    switch (el.type.toLowerCase()) {
      case 'file':
        // file inputs are not supported
      case 'submit':
      case 'reset':
      case 'button':
        // don't submit these
        break;
      case 'select-multiple':
        const values = getValue(el);
        if (values != null) {
          for (let value, j = 0; value = values[j]; j++) {
            map.set(name, value);
          }
        }
        break;
      default:
        const value = getValue(el);
        if (value != null) {
          map.set(name, value);
        }
    }
  });

  // input[type=image] are not included in the elements collection
  const inputs = form.getElementsByTagName('input');
  [...inputs].forEach(input => {
    if (input.form === form && input.type.toLowerCase() === 'image') {
      let name = input.name;
      map.set(name, input.value);
      map.set(name + '.x', '0');
      map.set(name + '.y', '0');
    }
  });

  return map;
};


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
 * @param {!Node} node The node to remove.
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
 * The scripts are evaluated in the scope of this panel.
 * @param {!Component} comp
 * @return {function(?NodeList)}
 */
export const evalScripts = comp => arr => {
  arr && Array.from(arr).forEach(s => {
    (function() {
      eval(s.text);
    }).bind(comp)();
  });
};

export const splitScripts = data => {
  const DF = new DOMParser().parseFromString(data, 'text/html');
  const df = /** @type {Document} */ (DF);
  return {
    html: df.body.firstElementChild,
    scripts: df.querySelectorAll('script')
  };
};

/**
 * @param {string} t
 */
export const handleTemplateProm = t => Promise.resolve(splitScripts(t));


