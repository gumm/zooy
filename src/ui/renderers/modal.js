/**
 * Carbon Design System - Modal Component Integration
 *
 * Carbon modals auto-initialize as Web Components.
 * We attach event listeners for open/close events to dispatch panel events.
 * Uses semantic attributes (event, open-event, close-event, primary-event).
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-modal--default
 */

import { getSemanticAttributes, getEventAttribute } from '../zoo/attributes.js';

/**
 * Renders Zooy modals and attaches event handlers.
 * Uses semantic attributes (event, open-event, close-event, primary-event).
 *
 * Semantic attributes:
 * - event: Default event name
 * - open-event: Event when modal opens
 * - close-event: Event when modal closes
 * - primary-event: Event on primary button click
 * - record-id: Record identifier
 * - endpoint: API endpoint URL
 * - data-*: App-specific custom data
 *
 * @param {Element} panel - The panel element to search for modals
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderModals = function (panel) {
  const zooModals = [...panel.querySelectorAll('zoo-modal')];

  zooModals.forEach(zooEl => {
    const carbonModal = zooEl.carbonElement;
    if (!carbonModal) return;

    const attrs = getSemanticAttributes(zooEl);

    // Listen for modal open events
    const openEvent = getEventAttribute(zooEl, 'open-event', 'event');
    if (openEvent) {
      this.listen(carbonModal, 'cds-modal-beingopened', e => {
        this.dispatchPanelEvent(openEvent, {
          ...attrs,
          action: 'opened'
        });
      });
    }

    // Listen for modal close events
    const closeEvent = getEventAttribute(zooEl, 'close-event', 'event');
    if (closeEvent) {
      this.listen(carbonModal, 'cds-modal-closed', e => {
        this.dispatchPanelEvent(closeEvent, {
          ...attrs,
          action: 'closed'
        });
      });
    }

    // Listen for primary button clicks in modal
    const primaryEvent = getEventAttribute(zooEl, 'primary-event', 'event');
    if (primaryEvent) {
      this.listen(carbonModal, 'cds-modal-primary-focus', e => {
        this.dispatchPanelEvent(primaryEvent, {
          ...attrs,
          action: 'primary'
        });
      });
    }
  });

  if (zooModals.length > 0) {
    this.debugMe(`Initialized ${zooModals.length} Zooy modal(s)`);
  }
};
