/**
 * Carbon Design System - Text Input Component Integration
 *
 * Carbon text inputs auto-initialize as Web Components.
 * We attach event listeners for input/change events to dispatch panel events.
 * Uses semantic attributes (event, change-event, record-id, endpoint).
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-text-input--default
 */

import { getSemanticAttributes, getEventAttribute } from '../zoo/attributes.js';

/**
 * Renders Zooy text inputs and attaches event handlers.
 * Uses semantic attributes (event, change-event, record-id, endpoint).
 *
 * Semantic attributes:
 * - event: Event on input (as user types)
 * - change-event: Event on blur/change
 * - record-id: Record identifier
 * - endpoint: API endpoint URL
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for text inputs
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderTextInputs = function (panel) {
  const zooInputs = [...panel.querySelectorAll('zoo-text-input')];

  zooInputs.forEach(zooEl => {
    const carbonInput = zooEl.carbonElement;
    if (!carbonInput) return;

    // Read semantic attributes once
    const attrs = getSemanticAttributes(zooEl);

    // Listen for input events (as user types)
    const inputEvent = attrs.event;
    if (inputEvent) {
      this.listen(carbonInput, 'input', e => {
        const trg = e.currentTarget;
        this.dispatchPanelEvent(inputEvent, {
          ...attrs,
          value: trg.value
        });
      });
    }

    // Listen for change events (when input loses focus)
    const changeEvent = getEventAttribute(zooEl, 'change-event', 'event');
    if (changeEvent) {
      this.listen(carbonInput, 'change', e => {
        const trg = e.currentTarget;
        this.dispatchPanelEvent(changeEvent, {
          ...attrs,
          value: trg.value
        });
      });
    }
  });

  if (zooInputs.length > 0) {
    this.debugMe(`Initialized ${zooInputs.length} Zooy text input(s)`);
  }
};
