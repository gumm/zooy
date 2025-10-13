/**
 * Zooy Dropdown Component
 *
 * A Web Component wrapper around Carbon Design System dropdown.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-dropdown event="option_selected" record-id="123" label="Select option">
 *     <cds-dropdown-item value="1">Option 1</cds-dropdown-item>
 *     <cds-dropdown-item value="2">Option 2</cds-dropdown-item>
 *   </zoo-dropdown>
 *
 * Visual Attributes (forwarded to Carbon):
 *   - label: Label text for the dropdown
 *   - value: Selected value
 *   - disabled: Boolean to disable dropdown
 *   - invalid: Boolean to show invalid state
 *   - invalid-text: Error message text
 *   - helper-text: Helper text below dropdown
 *   - size: Dropdown size (sm, md, lg)
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Event on selection change
 *   - record-id: Record identifier
 *   - endpoint: API endpoint URL
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-dropdown--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooDropdown Web Component
 * Wraps cds-dropdown with Zooy-specific functionality
 */
export class ZooDropdown extends HTMLElement {
  #carbonDropdown;

  constructor() {
    super();
    this.#carbonDropdown = null;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.#carbonDropdown) {
      this.updateCarbonDropdown();
    }
  }

  static get observedAttributes() {
    const visualAttrs = ['label', 'value', 'disabled', 'invalid',
                         'invalid-text', 'helper-text', 'size'];
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  render() {
    if (!this.#carbonDropdown) {
      this.#carbonDropdown = document.createElement('cds-dropdown');

      // Move all children (dropdown items) into the Carbon dropdown
      while (this.firstChild) {
        this.#carbonDropdown.appendChild(this.firstChild);
      }

      this.appendChild(this.#carbonDropdown);
    }
    this.updateCarbonDropdown();
  }

  updateCarbonDropdown() {
    if (!this.#carbonDropdown) return;

    // Forward only visual attributes to Carbon dropdown
    const visualAttrs = ['label', 'value', 'disabled', 'invalid',
                         'invalid-text', 'helper-text', 'size'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this.#carbonDropdown.setAttribute(attr, this.getAttribute(attr));
      } else {
        this.#carbonDropdown.removeAttribute(attr);
      }
    });

    // Semantic attributes stay on the zoo-dropdown wrapper
  }

  get carbonElement() {
    return this.#carbonDropdown;
  }

  get value() {
    return this.#carbonDropdown?.value || '';
  }

  set value(val) {
    if (this.#carbonDropdown) {
      this.#carbonDropdown.value = val;
    }
  }
}

customElements.define('zoo-dropdown', ZooDropdown);
