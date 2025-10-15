/**
 * MDC Tree Utilities
 *
 * These utilities are tightly coupled to MDC (Material Design Components)
 * and specifically to the deprecated MDC list structure used in Django templates.
 * They handle tree navigation, node selection, expand/collapse, and scrolling.
 *
 * These were previously in the base View class but have been extracted to the
 * MDC module since they're MDC-specific implementation details.
 *
 * @module ui/mdc/tree-utils
 */

import {enableClass, toggleClass} from '../../dom/utils.js';

/**
 * Determine if an element is in the viewport.
 * Used for scroll-into-view logic when selecting tree nodes.
 * @param  {Node} parent The parent container element
 * @return {Function} Returns a function that checks if an element is below the viewport
 * @private
 */
const needsToScroll = parent => {
  const parentRect = parent.getBoundingClientRect();
  const bottomMustBeLessThan = parentRect.bottom;
  return elem => {
    const distance = elem.getBoundingClientRect();
    return distance.bottom > bottomMustBeLessThan;
  };
};

/**
 * Selects a tree node by ID and ensures it's visible.
 * This is MDC-specific - it uses the 'mdc-deprecated-list-item--activated' class.
 *
 * @param {Panel} panel - The panel containing the tree
 * @returns {Function} A function that accepts a node ID and selects it
 *
 * @example
 * const selectNode = treeNodeSelect(panel);
 * selectNode('folder-123'); // Selects node with id="tree-node_folder-123"
 */
export const treeNodeSelect = panel => id => {
  const treeContainer = panel.getElement().querySelector('.zv_tree_container');
  const isHidden = needsToScroll(treeContainer);
  const allNodes = panel.getElement().querySelectorAll('.tree-node');
  let targetNode = undefined;
  [...allNodes].forEach(n => {
    // MDC-specific class for activated state
    enableClass(n, 'mdc-deprecated-list-item--activated', n.id === `tree-node_${id}`);
    if (n.id === `tree-node_${id}`) {
      targetNode = n;
    }
  });

  if (targetNode && isHidden(targetNode)) {
    targetNode.scrollIntoView(false);
  }
};

/**
 * Toggle the whole tree display either open or closed.
 * The first level children always remain open for better UX.
 *
 * @param {{isOn: boolean}} eventData - Event data with toggle state
 * @param {Panel} panel - The panel containing the tree
 */
export const toggleTree = (eventData, panel) => {
  // The first level children. From a pure usability perspective
  // it's nicer if we don't close these. If we did, the tree *always* ends
  // up with only one element revealed. So we keep the first level children
  // open at all times.
  const fc = panel.getElement().querySelector('.children');
  const isOn = /**@type {boolean} */ (eventData.isOn);
  const children = panel.getElement().querySelectorAll('.children');
  const revealIcons = panel.getElement().querySelectorAll('.zoo__reveal_icon');
  [...children].forEach(e => enableClass(
    e, 'zoo__tree-children__hidden', e !== fc && !isOn));
  [...revealIcons].forEach(e => enableClass(
    e, 'zoo__icon_rotated', e !== fc && !isOn));
};

/**
 * Toggle children visibility for a specific tree node.
 *
 * @param {Panel} panel - The panel containing the tree
 * @param {{trigger:!HTMLElement}} eventData - Event data with trigger element
 */
export const toggleTreeChildren = (panel, eventData) => {
  const revealIcon = eventData.trigger;
  const elId = revealIcon.getAttribute('data-child-id');
  const child = panel.getElement().querySelector(`#${elId}`);
  toggleClass(child, 'zoo__tree-children__hidden');
  toggleClass(revealIcon, 'zoo__icon_rotated');
};

/**
 * Open all tree nodes from the given element up to the root.
 * Recursive function that walks up the DOM tree.
 *
 * @param {!Panel} _panel - The panel containing the tree (unused but kept for signature compatibility)
 * @param {!HTMLElement} n - The node to start from
 * @private
 */
export const _openTreeFromNodeUp = (_panel, n) => {
  const parentNode = n.parentElement;
  if (parentNode.classList.contains('children')) {
    enableClass(parentNode, 'zoo__tree-children__hidden', false);
    _openTreeFromNodeUp(_panel, parentNode);
  }
};
