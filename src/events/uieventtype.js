/**
 * @fileoverview Panel Event Types.
 *
 */

import { randomId } from '../../node_modules/badu/badu.js';

/**
 * Constants for panel event.
 * @enum {string}
 */
// noinspection JSUnusedGlobalSymbols
export const UiEventType = {
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
