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
  #carbonCheckbox;

  constructor() {
    super();
    this.#carbonCheckbox = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#carbonCheckbox) {
      this.updateCarbonCheckbox();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['checked', 'value', 'disabled', 'indeterminate', 'label-text'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this.#carbonCheckbox) {
      this.#carbonCheckbox = document.createElement('cds-checkbox');

      // Move slot content into the Carbon checkbox
      while (this.firstChild) {
        this.#carbonCheckbox.appendChild(this.firstChild);
      }

      this.appendChild(this.#carbonCheckbox);
    }
    this.updateCarbonCheckbox();
  }

  updateCarbonCheckbox() {
    if (!this.#carbonCheckbox) return;

    // Forward only visual attributes to Carbon checkbox
    const visualAttrs = ['checked', 'value', 'disabled', 'indeterminate', 'label-text'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this.#carbonCheckbox.setAttribute(attr, this.getAttribute(attr));
      } else {
        this.#carbonCheckbox.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-checkbox wrapper
  }

  get carbonElement() {
    return this.#carbonCheckbox;
  }

  get checked() {
    return this.#carbonCheckbox?.checked || false;
  }

  set checked(val) {
    if (this.#carbonCheckbox) {
      this.#carbonCheckbox.checked = val;
    }
  }
}

customElements.define('zoo-checkbox', ZooCheckbox);
