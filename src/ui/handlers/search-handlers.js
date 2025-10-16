/**
 * Search Handlers
 *
 * Panel event handlers for search functionality.
 * These handlers implement common search patterns with query parameter management.
 *
 * Note: These are currently used by the base View class for backwards compatibility,
 * but will eventually be opt-in. Applications should explicitly register these
 * if they need search functionality:
 *
 * @example
 * import { SearchHandlers } from 'zooy/handlers';
 *
 * class MyView extends View {
 *   initPanelEvents() {
 *     super.initPanelEvents();
 *     this.addHandlers(SearchHandlers);
 *   }
 * }
 *
 * @module ui/handlers/search-handlers
 */

/**
 * Collection of search-related panel event handlers.
 * These handlers expect to be called with View context (`this`).
 *
 * @type {Object<string, Function>}
 */
export const SearchHandlers = {
  /**
   * Perform search with query parameter management.
   * Updates panel query params and fetches new content.
   *
   * @param {Object} eventData - Event data with formData.q containing search query
   * @param {Panel} ePanel - The panel to update
   */
  'search_by_qdict': function(eventData, ePanel) {
    const qString = eventData.formData.q;
    if (qString !== '') {
      ePanel.addToQParams('q', qString);
    } else {
      ePanel.removeFromQParams('q');
    }
    this.user.fetchAndSplit(ePanel.uri, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  },

  /**
   * Perform search with query string construction.
   * Builds href with search query and additional query parameters.
   *
   * @param {Object} eventData - Event data with href, formData.q, and targetval
   * @param {Panel} ePanel - The panel to update
   */
  'search': function(eventData, ePanel) {
    let href = `${eventData.href}`;
    const qString = eventData.formData.q;
    const qDict = eventData.targetval;
    if (qString !== '') {
      href = `${href}?q=${qString}`;
    }
    if (qDict !== '') {
      let newQDict = qDict;
      if (qDict.includes('page=')) {
        newQDict = qDict.split('&').filter(e => !e.includes('page=')).join('&');
      }
      href = qString !== '' ? `${href}&${newQDict}` : `${href}?${newQDict}`;
    }
    this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
      s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
    );
  },

  /**
   * Reset search form and query parameters.
   * Clears the 'q' field in the closest form and removes 'q' from query params.
   *
   * @param {Object} eventData - Event data with trigger element
   * @param {Panel} ePanel - The panel to update
   */
  'reset_search': function(eventData, ePanel) {
    // Grab the closest form up the DOM, reset its 'q' field and make
    // it use the normal submit logic.
    const form = eventData.trigger.closest('form');
    ePanel.removeFromQParams('q');
    form.elements['q'].value = '';
    form.dispatchEvent(new Event('submit'));
  }
};
