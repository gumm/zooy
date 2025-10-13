/**
 * Zooy Modal Component
 *
 * A Web Component wrapper around Carbon Design System modal.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-modal event="modal_action" open-event="opened" close-event="closed">
 *     <cds-modal-header>
 *       <cds-modal-heading>Modal Title</cds-modal-heading>
 *     </cds-modal-header>
 *     <cds-modal-body>Modal content</cds-modal-body>
 *     <cds-modal-footer>
 *       <cds-modal-footer-button kind="secondary">Cancel</cds-modal-footer-button>
 *       <cds-modal-footer-button>Confirm</cds-modal-footer-button>
 *     </cds-modal-footer>
 *   </zoo-modal>
 *
 * Visual Attributes (forwarded to Carbon):
 *   - open: Boolean to show/hide modal
 *   - size: Modal size (xs, sm, md, lg)
 *   - danger: Boolean for danger modal style
 *   - prevent-close-on-click-outside: Prevent closing on backdrop click
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Default event name
 *   - open-event: Event when modal opens
 *   - close-event: Event when modal closes
 *   - primary-event: Event on primary button click
 *   - record-id: Record identifier
 *   - endpoint: API endpoint URL
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-modal--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooModal Web Component
 * Wraps cds-modal with Zooy-specific functionality
 */
export class ZooModal extends HTMLElement {
  constructor() {
    super();
    this._carbonModal = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._carbonModal) {
      this.updateCarbonModal();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['open', 'size', 'danger', 'prevent-close-on-click-outside'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this._carbonModal) {
      this._carbonModal = document.createElement('cds-modal');

      // Move all children into the Carbon modal
      while (this.firstChild) {
        this._carbonModal.appendChild(this.firstChild);
      }

      this.appendChild(this._carbonModal);
    }
    this.updateCarbonModal();
  }

  updateCarbonModal() {
    if (!this._carbonModal) return;

    // Forward only visual attributes to Carbon modal
    const visualAttrs = ['open', 'size', 'danger', 'prevent-close-on-click-outside'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this._carbonModal.setAttribute(attr, this.getAttribute(attr));
      } else {
        this._carbonModal.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-modal wrapper
  }

  get carbonElement() {
    return this._carbonModal;
  }

  // Convenience methods
  get open() {
    return this._carbonModal?.hasAttribute('open') || false;
  }

  set open(val) {
    if (this._carbonModal) {
      if (val) {
        this._carbonModal.setAttribute('open', '');
      } else {
        this._carbonModal.removeAttribute('open');
      }
    }
  }

  show() {
    this.open = true;
  }

  hide() {
    this.open = false;
  }
}

customElements.define('zoo-modal', ZooModal);
