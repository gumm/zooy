/**
 * Zooy Radio Button Component
 *
 * A Web Component wrapper around Carbon Design System radio button.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-radio-button-group event="option_selected" record-id="123" legend="Choose option">
 *     <zoo-radio-button value="1">Option 1</zoo-radio-button>
 *     <zoo-radio-button value="2">Option 2</zoo-radio-button>
 *   </zoo-radio-button-group>
 *
 * Radio Button Visual Attributes (forwarded to Carbon):
 *   - checked: Boolean for checked state
 *   - value: Radio button value
 *   - disabled: Boolean to disable radio button
 *   - label-text: Label text (can also use slot content)
 *
 * Radio Button Group Visual Attributes (forwarded to Carbon):
 *   - legend: Legend text for the group
 *   - disabled: Boolean to disable all radio buttons
 *   - invalid: Boolean to show invalid state
 *   - invalid-text: Error message text
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Event on change/selection
 *   - record-id: Record identifier
 *   - endpoint: API endpoint URL
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-radio-button--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooRadioButton Web Component
 * Wraps cds-radio-button with Zooy-specific functionality
 */
export class ZooRadioButton extends HTMLElement {
  #carbonRadio;

  constructor() {
    super();
    this.#carbonRadio = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#carbonRadio) {
      this.updateCarbonRadio();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['checked', 'value', 'disabled', 'label-text'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this.#carbonRadio) {
      this.#carbonRadio = document.createElement('cds-radio-button');

      // Move slot content into the Carbon radio button
      while (this.firstChild) {
        this.#carbonRadio.appendChild(this.firstChild);
      }

      this.appendChild(this.#carbonRadio);
    }
    this.updateCarbonRadio();
  }

  updateCarbonRadio() {
    if (!this.#carbonRadio) return;

    // Forward only visual attributes to Carbon radio button
    const visualAttrs = ['checked', 'value', 'disabled', 'label-text'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this.#carbonRadio.setAttribute(attr, this.getAttribute(attr));
      } else {
        this.#carbonRadio.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-radio-button wrapper
  }

  get carbonElement() {
    return this.#carbonRadio;
  }

  get checked() {
    return this.#carbonRadio?.checked || false;
  }

  set checked(val) {
    if (this.#carbonRadio) {
      this.#carbonRadio.checked = val;
    }
  }
}

/**
 * ZooRadioButtonGroup Web Component
 * Wraps cds-radio-button-group with Zooy-specific functionality
 */
export class ZooRadioButtonGroup extends HTMLElement {
  #carbonGroup;

  constructor() {
    super();
    this.#carbonGroup = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#carbonGroup) {
      this.updateCarbonGroup();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['legend', 'disabled', 'invalid', 'invalid-text'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this.#carbonGroup) {
      this.#carbonGroup = document.createElement('cds-radio-button-group');

      // Move all children into the Carbon group
      while (this.firstChild) {
        this.#carbonGroup.appendChild(this.firstChild);
      }

      this.appendChild(this.#carbonGroup);
    }
    this.updateCarbonGroup();
  }

  updateCarbonGroup() {
    if (!this.#carbonGroup) return;

    // Forward only visual attributes to Carbon group
    const visualAttrs = ['legend', 'disabled', 'invalid', 'invalid-text'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this.#carbonGroup.setAttribute(attr, this.getAttribute(attr));
      } else {
        this.#carbonGroup.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-radio-button-group wrapper
  }

  get carbonElement() {
    return this.#carbonGroup;
  }
}

customElements.define('zoo-radio-button', ZooRadioButton);
customElements.define('zoo-radio-button-group', ZooRadioButtonGroup);
