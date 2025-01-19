/**
 * @fileoverview Panel Event Types.
 *
 */

import { randomId } from 'badu';

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
  SPLIT_WILL_OPEN: randomId(),
  SPLIT_DID_OPEN: randomId(),
  SPLIT_WILL_CLOSE: randomId(),
  SPLIT_DID_CLOSE: randomId(),
  SPLIT_TRANSITION_END: randomId(),
  READY: randomId(),
  PANEL_MINIMIZE: randomId(),
  FORM_SUBMIT_SUCCESS: randomId(),
};
