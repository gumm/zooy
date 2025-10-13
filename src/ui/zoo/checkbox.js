/**
 * Zooy Checkbox Component
 *
 * A Web Component wrapper around Carbon Design System checkbox.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-checkbox event="terms_accepted" record-id="123" value="agree">
 *     I agree to the terms
 *   </zoo-checkbox>
 *
 * Visual Attributes (forwarded to Carbon):
 *   - checked: Boolean for checked state
 *   - value: Checkbox value
 *   - disabled: Boolean to disable checkbox
 *   - indeterminate: Boolean for indeterminate state
 *   - label-text: Label text (can also use slot content)
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Event on change
 *   - record-id: Record identifier
 *   - endpoint: API endpoint URL
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-checkbox--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooCheckbox Web Component
 * Wraps cds-checkbox with Zooy-specific functionality
 */
export class ZooCheckbox extends HTMLElement {
  constructor() {
    super();
    this._carbonCheckbox = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._carbonCheckbox) {
      this.updateCarbonCheckbox();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['checked', 'value', 'disabled', 'indeterminate', 'label-text'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this._carbonCheckbox) {
      this._carbonCheckbox = document.createElement('cds-checkbox');

      // Move slot content into the Carbon checkbox
      while (this.firstChild) {
        this._carbonCheckbox.appendChild(this.firstChild);
      }

      this.appendChild(this._carbonCheckbox);
    }
    this.updateCarbonCheckbox();
  }

  updateCarbonCheckbox() {
    if (!this._carbonCheckbox) return;

    // Forward only visual attributes to Carbon checkbox
    const visualAttrs = ['checked', 'value', 'disabled', 'indeterminate', 'label-text'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this._carbonCheckbox.setAttribute(attr, this.getAttribute(attr));
      } else {
        this._carbonCheckbox.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-checkbox wrapper
  }

  get carbonElement() {
    return this._carbonCheckbox;
  }

  get checked() {
    return this._carbonCheckbox?.checked || false;
  }

  set checked(val) {
    if (this._carbonCheckbox) {
      this._carbonCheckbox.checked = val;
    }
  }
}

customElements.define('zoo-checkbox', ZooCheckbox);
