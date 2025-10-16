/**
 * Handler Collections
 *
 * This module exports collections of panel event handlers that can be
 * optionally registered by Views. This provides a clean separation between
 * framework code and application-specific patterns.
 *
 * Usage:
 * ------
 * Applications can selectively import and register handler collections:
 *
 * @example
 * import View from 'zooy';
 * import { SearchHandlers, QueryParamHandlers, MdcTreeHandlers } from 'zooy/handlers';
 *
 * class MyView extends View {
 *   initPanelEvents() {
 *     super.initPanelEvents();
 *
 *     // Register only the handlers you need
 *     this.addHandlers(SearchHandlers);
 *     this.addHandlers(QueryParamHandlers);
 *     this.addHandlers(MdcTreeHandlers);
 *   }
 *
 *   addHandlers(handlerCollection) {
 *     Object.entries(handlerCollection).forEach(([name, fn]) => {
 *       this.mapPanEv(name, fn.bind(this));
 *     });
 *   }
 * }
 *
 * @module ui/handlers
 */

export {MdcTreeHandlers} from './mdc-tree-handlers.js';
export {SearchHandlers} from './search-handlers.js';
export {QueryParamHandlers} from './query-param-handlers.js';
