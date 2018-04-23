/**
 * @fileoverview Panel Event Types.
 *
 */

import { privateRandom } from '../../node_modules/badu/module/badu.mjs';

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
  COMP_DRAGGED: privateRandom(),
  VIEW: privateRandom(),
  READY: privateRandom(),
  PANEL_MINIMIZE: privateRandom(),
  FORM_SUBMIT_SUCCESS: privateRandom(),
};
