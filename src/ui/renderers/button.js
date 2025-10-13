/**
 * Carbon Design System - Button Component Integration
 *
 * Carbon buttons auto-initialize as Web Components, so we only need to:
 * 1. Ensure the component is loaded
 * 2. Attach Zooy event listeners to dispatch panel events
 *
 * Supports both direct Carbon buttons and Zooy button wrappers.
 * Zooy buttons use semantic attributes (event, record-id, endpoint)
 * instead of data-* attributes (data-zv, data-pk, data-href).
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-button--default
 */

import { getSemanticAttributes, getEventName } from '../zoo/attributes.js';

/**
 * Renders Zooy buttons and attaches event handlers.
 * Uses semantic attributes (event, record-id, endpoint) for configuration.
 *
 * Semantic attributes:
 * - event: Event name to dispatch on click
 * - record-id: Record identifier/primary key
 * - endpoint: API endpoint URL
 * - action: Semantic action name
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for buttons
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderButtons = function (panel) {
  const zooButtons = [...panel.querySelectorAll('zoo-button')];

  zooButtons.forEach(zooEl => {
    // Get the inner Carbon button from the Zooy wrapper
    const carbonButton = zooEl.carbonElement;
    if (!carbonButton) return;

    this.listen(carbonButton, 'click', e => {
      // Read semantic attributes from the zoo-button wrapper
      const attrs = getSemanticAttributes(zooEl);
      const eventName = attrs.event;

      if (eventName) {
        e.stopPropagation();
        // Dispatch panel event with all semantic attributes + custom data-*
        this.dispatchPanelEvent(eventName, attrs);
      }
    });
  });

  if (zooButtons.length > 0) {
    this.debugMe(`Initialized ${zooButtons.length} Zooy button(s)`);
  }
};
