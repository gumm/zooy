/**
 * Carbon Design System - Radio Button Component Integration
 *
 * Carbon radio buttons auto-initialize as Web Components.
 * We attach event listeners for selection changes to dispatch panel events.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * Note: Radio buttons are typically grouped in <cds-radio-button-group>
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-radio-button--default
 */

import { getSemanticAttributes } from '../zoo/attributes.js';

/**
 * Renders Zooy radio buttons and attaches event handlers.
 * Uses semantic attributes (event, record-id, endpoint).
 *
 * Semantic attributes:
 * - event: Event on change/selection
 * - record-id: Record identifier
 * - endpoint: API endpoint URL
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for radio buttons
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderRadioButtons = function (panel) {
  // Individual radio buttons
  const zooRadioButtons = [...panel.querySelectorAll('zoo-radio-button')];

  zooRadioButtons.forEach(zooEl => {
    const carbonRadio = zooEl.carbonElement;
    if (!carbonRadio) return;

    this.listen(carbonRadio, 'change', e => {
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

  // Radio button groups
  const zooRadioGroups = [...panel.querySelectorAll('zoo-radio-button-group')];

  zooRadioGroups.forEach(zooEl => {
    const carbonGroup = zooEl.carbonElement;
    if (!carbonGroup) return;

    this.listen(carbonGroup, 'cds-radio-button-group-changed', e => {
      const attrs = getSemanticAttributes(zooEl);
      const eventName = attrs.event;

      if (eventName) {
        this.dispatchPanelEvent(eventName, {
          ...attrs,
          value: e.detail?.value
        });
      }
    });
  });

  if (zooRadioButtons.length > 0) {
    this.debugMe(`Initialized ${zooRadioButtons.length} Zooy radio button(s)`);
  }
  if (zooRadioGroups.length > 0) {
    this.debugMe(`Initialized ${zooRadioGroups.length} Zooy radio button group(s)`);
  }
};
