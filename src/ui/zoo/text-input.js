/**
 * Zooy Text Input Component
 *
 * A Web Component wrapper around Carbon Design System text input.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-text-input event="username_input" change-event="username_changed"
 *                   label="Username" placeholder="Enter username">
 *   </zoo-text-input>
 *
 * Visual Attributes (forwarded to Carbon):
 *   - label: Label text for the input
 *   - placeholder: Placeholder text
 *   - value: Input value
 *   - disabled: Boolean to disable input
 *   - invalid: Boolean to show invalid state
 *   - invalid-text: Error message text
 *   - helper-text: Helper text below input
 *   - size: Input size (sm, md, lg)
 *   - type: Input type (text, password, email, etc.)
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Event on input (as user types)
 *   - change-event: Event on blur/change
 *   - record-id: Record identifier
 *   - endpoint: API endpoint URL
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-text-input--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooTextInput Web Component
 * Wraps cds-text-input with Zooy-specific functionality
 */
export class ZooTextInput extends HTMLElement {
  constructor() {
    super();
    this._carbonInput = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._carbonInput) {
      this.updateCarbonInput();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['label', 'placeholder', 'value', 'disabled', 'invalid',
                         'invalid-text', 'helper-text', 'size', 'type'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this._carbonInput) {
      this._carbonInput = document.createElement('cds-text-input');
      this.appendChild(this._carbonInput);
    }
    this.updateCarbonInput();
  }

  updateCarbonInput() {
    if (!this._carbonInput) return;

    // Forward only visual attributes to Carbon input
    const visualAttrs = ['label', 'placeholder', 'value', 'disabled', 'invalid',
                         'invalid-text', 'helper-text', 'size', 'type'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this._carbonInput.setAttribute(attr, this.getAttribute(attr));
      } else {
        this._carbonInput.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-text-input wrapper
  }

  get carbonElement() {
    return this._carbonInput;
  }

  // Convenience getters/setters
  get value() {
    return this._carbonInput?.value || '';
  }

  set value(val) {
    if (this._carbonInput) {
      this._carbonInput.value = val;
    }
  }
}

customElements.define('zoo-text-input', ZooTextInput);
