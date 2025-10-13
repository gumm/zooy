/**
 * Carbon Design System - Checkbox Component Integration
 *
 * Carbon checkboxes auto-initialize as Web Components.
 * We attach event listeners for check/uncheck events to dispatch panel events.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-checkbox--default
 */

import { getSemanticAttributes } from '../zoo/attributes.js';

/**
 * Renders Zooy checkboxes and attaches event handlers.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * Semantic attributes:
 * - event: Event on change
 * - record-id: Record identifier
 * - endpoint: API endpoint URL
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for checkboxes
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderCheckboxes = function (panel) {
  const zooCheckboxes = [...panel.querySelectorAll('zoo-checkbox')];

  zooCheckboxes.forEach(zooEl => {
    const carbonCheckbox = zooEl.carbonElement;
    if (!carbonCheckbox) return;

    this.listen(carbonCheckbox, 'change', e => {
      const trg = e.currentTarget;
      const attrs = getSemanticAttributes(zooEl);
      const eventName = attrs.event;

      if (eventName) {
        this.dispatchPanelEvent(eventName, {
          ...attrs,
          checked: trg.checked,
          value: trg.value
        });
      }
    });
  });

  if (zooCheckboxes.length > 0) {
    this.debugMe(`Initialized ${zooCheckboxes.length} Zooy checkbox(es)`);
  }
};
