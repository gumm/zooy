/**
 * MDC Tree Handlers
 *
 * Panel event handlers for MDC (Material Design Components) tree functionality.
 * These handlers are MDC-specific and should be registered by applications
 * that use MDC trees.
 *
 * Applications should import and register these handlers if they use MDC trees:
 *
 * @example
 * import { MdcTreeHandlers } from 'zooy/handlers';
 *
 * class MyView extends View {
 *   initPanelEvents() {
 *     super.initPanelEvents();
 *     this.addHandlers(MdcTreeHandlers);
 *   }
 * }
 *
 * @module ui/handlers/mdc-tree-handlers
 */

import {toggleTree, toggleTreeChildren} from '../mdc/tree-utils.js';

/**
 * Collection of MDC tree-related panel event handlers.
 * These handlers expect to be called with View context (`this`).
 *
 * @type {Object<string, Function>}
 */
export const MdcTreeHandlers = {
  /**
   * Toggle the entire tree open or closed.
   * First level children remain open for better UX.
   *
   * @param {Object} eventData - Event data with isOn boolean
   * @param {Panel} ePanel - The panel containing the tree
   */
  'toggle_tree': function(eventData, ePanel) {
    toggleTree(eventData, ePanel);
  },

  /**
   * Toggle children visibility for a specific tree node.
   *
   * @param {Object} eventData - Event data with trigger element
   * @param {Panel} ePanel - The panel containing the tree
   */
  'tree_toggle-children': function(eventData, ePanel) {
    toggleTreeChildren(ePanel, eventData);
  }
};
