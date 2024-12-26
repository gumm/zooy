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
  COMP: "COMP" + randomId(),
  COMP_DRAG_START: "COMP_DRAG_START" + randomId(),
  COMP_DRAG_MOVE: "COMP_DRAG_MOVE" + randomId(),
  COMP_DRAG_END: "COMP_DRAG_END" + randomId(),
  PANEL: "PANEL" + randomId(),
  VIEW: "VIEW" + randomId(),
  SPLIT: "SPLIT" +randomId(),
  SPLIT_TRANSITION_END: "SPLIT_TRANSITION_END" + randomId(),
  READY: "READY" + randomId(),
  PANEL_MINIMIZE: "PANEL_MINIMIZE" + randomId(),
  FORM_SUBMIT_SUCCESS: "FORM_SUBMIT_SUCCESS" + randomId(),
};
