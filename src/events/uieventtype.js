/**
 * @fileoverview Panel Event Types.
 *
 */

import { privateRandom } from '../../node_modules/badu/src/badu.js';

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
  COMP: privateRandom(),
  COMP_DRAG_START: privateRandom(),
  COMP_DRAG_MOVE: privateRandom(),
  COMP_DRAG_END: privateRandom(),
  PANEL: privateRandom(),
  VIEW: privateRandom(),
  SPLIT: privateRandom(),
  READY: privateRandom(),
  PANEL_MINIMIZE: privateRandom(),
  FORM_SUBMIT_SUCCESS: privateRandom(),
};
