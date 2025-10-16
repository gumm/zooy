/**
 * Query Parameter Handlers
 *
 * Panel event handlers for query parameter manipulation and content filtering.
 * These handlers implement common patterns for pagination, filtering, and
 * query parameter management.
 *
 * Note: These are currently used by the base View class for backwards compatibility,
 * but will eventually be opt-in. Applications should explicitly register these
 * if they need query parameter manipulation:
 *
 * @example
 * import { QueryParamHandlers } from 'zooy/handlers';
 *
 * class MyView extends View {
 *   initPanelEvents() {
 *     super.initPanelEvents();
 *     this.addHandlers(QueryParamHandlers);
 *   }
 * }
 *
 * @module ui/handlers/query-param-handlers
 */

/**
 * Collection of query parameter manipulation event handlers.
 * These handlers expect to be called with View context (`this`).
 *
 * @type {Object<string, Function>}
 */
export const QueryParamHandlers = {
  /**
   * Handle pagination by fetching content with query parameters.
   *
   * @param {Object} eventData - Event data with href and targetval for pagination
   * @param {Panel} ePanel - The panel to update
   */
  'paginate': function(eventData, ePanel) {
    const href = `${eventData.href}?${eventData.targetval}`;
    this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  },

  /**
   * Handle list filtering with query parameters.
   *
   * @param {Object} eventData - Event data with href and targetval for filtering
   * @param {Panel} ePanel - The panel to update
   */
  'list_filter': function(eventData, ePanel) {
    const href = `${eventData.href}?${eventData.targetval}`;
    this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  },

  /**
   * Add a key-value pair to the panel's query parameters and refresh content.
   *
   * @param {Object} eventData - Event data with zqdictkey and zqdictvalue
   * @param {Panel} ePanel - The panel to update
   */
  'add_q_dict_kv': function(eventData, ePanel) {
    ePanel.addToQParams(eventData.zqdictkey, eventData.zqdictvalue);
    this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  },

  /**
   * Remove a key from the panel's query parameters and refresh content.
   *
   * @param {Object} eventData - Event data with zqdictkey to remove
   * @param {Panel} ePanel - The panel to update
   */
  'remove_q_dict_k': function(eventData, ePanel) {
    ePanel.removeFromQParams(eventData.zqdictkey);
    this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  }
};
