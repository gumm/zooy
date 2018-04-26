
/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node} The node removed if removed; else, null.
 */
export const removeNode = function(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};

/**
 * @param {Node} node
 * @return {boolean}
 */
export const isInPage = node => {
  return (node === document.body) ? false : document.body.contains(node);
};

/**
 * @param {HTMLElement} el
 * @return {Array<number>}
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

