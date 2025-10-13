/**
 * Carbon Design System - Dropdown Component Integration
 *
 * Carbon dropdowns auto-initialize as Web Components.
 * We attach event listeners for selection changes to dispatch panel events.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-dropdown--default
 */

import { getSemanticAttributes } from '../zoo/attributes.js';

/**
 * Renders Zooy dropdowns and attaches event handlers.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * Semantic attributes:
 * - event: Event on selection change
 * - record-id: Record identifier
 * - endpoint: API endpoint URL
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for dropdowns
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderDropdowns = function (panel) {
  const zooDropdowns = [...panel.querySelectorAll('zoo-dropdown')];

  zooDropdowns.forEach(zooEl => {
    const carbonDropdown = zooEl.carbonElement;
    if (!carbonDropdown) return;

    this.listen(carbonDropdown, 'cds-dropdown-selected', e => {
      const attrs = getSemanticAttributes(zooEl);
      const eventName = attrs.event;

      if (eventName) {
        const selectedItem = e.detail?.item;
        this.dispatchPanelEvent(eventName, {
          ...attrs,
          value: carbonDropdown.value,
          selectedValue: selectedItem?.value,
          selectedText: selectedItem?.textContent?.trim()
        });
      }
    });
  });

  if (zooDropdowns.length > 0) {
    this.debugMe(`Initialized ${zooDropdowns.length} Zooy dropdown(s)`);
  }
};
