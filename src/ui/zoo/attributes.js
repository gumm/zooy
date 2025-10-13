/**
 * Semantic Attributes for Zooy Components
 *
 * Zooy uses semantic, self-documenting attributes instead of cryptic data-* prefixes.
 * This module defines the vocabulary and provides helpers for reading them.
 *
 * Semantic Attribute Vocabulary:
 *
 * Event Attributes:
 * - event: Primary event to dispatch (was data-zv)
 * - change-event: Event on change/blur (was data-zv-change)
 * - open-event: Event when opened (was data-zv-open)
 * - close-event: Event when closed (was data-zv-close)
 * - primary-event: Event on primary action (was data-zv-primary)
 *
 * Data/Record Identification:
 * - record-id: Primary key/identifier (was data-pk)
 * - record-type: Type of record (was data-record-type)
 *
 * URLs/Endpoints:
 * - endpoint: API endpoint URL (was data-href)
 * - url: Generic URL (was data-url)
 *
 * Actions/Operations:
 * - action: Semantic action name (was data-action)
 * - method: HTTP method (was data-method)
 *
 * Targeting:
 * - target: Target element selector (was data-target)
 *
 * Custom Data:
 * - data-*: App-specific custom attributes (unchanged)
 *
 * Usage:
 *   <zoo-button event="save_user" record-id="123" endpoint="/api/users/123">
 *     Save User
 *   </zoo-button>
 *
 *   const attrs = getSemanticAttributes(buttonElement);
 *   // attrs = { event: 'save_user', recordId: '123', endpoint: '/api/users/123', ... }
 */

/**
 * List of semantic attributes recognized by Zooy components.
 * These are the framework-level attributes that have special meaning.
 */
export const SEMANTIC_ATTRIBUTES = [
  // Event attributes
  'event',
  'change-event',
  'open-event',
  'close-event',
  'primary-event',

  // Data/Record identification
  'record-id',
  'record-type',

  // URLs/Endpoints
  'endpoint',
  'url',

  // Actions/Operations
  'action',
  'method',

  // Targeting
  'target',
];

/**
 * Map of attribute names to camelCase property names.
 * Used when creating the event data object.
 */
const ATTRIBUTE_TO_PROPERTY = {
  'event': 'event',
  'change-event': 'changeEvent',
  'open-event': 'openEvent',
  'close-event': 'closeEvent',
  'primary-event': 'primaryEvent',
  'record-id': 'recordId',
  'record-type': 'recordType',
  'endpoint': 'endpoint',
  'url': 'url',
  'action': 'action',
  'method': 'method',
  'target': 'target',
};

/**
 * Get all semantic attributes from an element.
 * Returns an object with camelCase property names.
 *
 * Also includes any data-* attributes for app-specific custom data.
 *
 * @param {Element} element - The element to read attributes from
 * @returns {Object} Object with semantic attributes and data-* attributes
 *
 * @example
 * <zoo-button event="save" record-id="123" endpoint="/api/save" data-category="admin">
 *
 * getSemanticAttributes(el) =>
 * {
 *   event: 'save',
 *   recordId: '123',
 *   endpoint: '/api/save',
 *   category: 'admin'  // from data-category
 * }
 */
export const getSemanticAttributes = (element) => {
  const attrs = {};

  // Read semantic attributes
  SEMANTIC_ATTRIBUTES.forEach(attrName => {
    const value = element.getAttribute(attrName);
    if (value !== null) {
      const propName = ATTRIBUTE_TO_PROPERTY[attrName];
      attrs[propName] = value;
    }
  });

  // Also include data-* attributes for custom app data
  Array.from(element.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      // Convert data-my-attr to myAttr
      const propName = attr.name
        .slice(5) // remove 'data-'
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      attrs[propName] = attr.value;
    }
  });

  return attrs;
};

/**
 * Get the primary event name from an element.
 * Checks for 'event' attribute.
 *
 * @param {Element} element - The element to read from
 * @returns {string|null} Event name or null if not found
 */
export const getEventName = (element) => {
  return element.getAttribute('event');
};

/**
 * Get a specific event attribute (event, change-event, open-event, etc.)
 *
 * @param {Element} element - The element to read from
 * @param {string} eventType - Type of event: 'event', 'change-event', 'open-event', etc.
 * @param {string} [fallback='event'] - Fallback to check if eventType not found
 * @returns {string|null} Event name or null if not found
 */
export const getEventAttribute = (element, eventType, fallback = 'event') => {
  return element.getAttribute(eventType) || element.getAttribute(fallback);
};
