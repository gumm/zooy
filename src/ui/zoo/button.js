/**
 * Zooy Button Component
 *
 * A Web Component wrapper around Carbon Design System button.
 * Uses semantic, self-documenting attributes for Zooy event configuration.
 *
 * Usage:
 *   <zoo-button event="save_user" record-id="123" endpoint="/api/users/123" kind="primary">
 *     Save User
 *   </zoo-button>
 *
 * Visual Attributes (forwarded to Carbon button):
 *   - kind: Button style (primary, secondary, tertiary, ghost, danger)
 *   - size: Button size (sm, md, lg, xl, 2xl)
 *   - disabled: Boolean to disable button
 *   - href: Makes button act as link
 *
 * Semantic Event Attributes (used by Zooy event system):
 *   - event: Event name to dispatch on click
 *   - record-id: Record identifier/primary key
 *   - endpoint: API endpoint URL
 *   - action: Semantic action name
 *   - data-*: App-specific custom data
 *
 * @see https://web-components.carbondesignsystem.com/?path=/story/components-button--default
 */

import { SEMANTIC_ATTRIBUTES } from './attributes.js';

/**
 * ZooButton Web Component
 * Wraps cds-button with Zooy-specific functionality
 */
export class ZooButton extends HTMLElement {
  constructor() {
    super();
    this._carbonButton = null;
  }

  /**
   * Called when element is inserted into DOM
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Called when observed attributes change
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._carbonButton) {
      this.updateCarbonButton();
    }
  }

  /**
   * List of attributes to watch for changes.
   * Includes both visual attributes (forwarded to Carbon) and semantic attributes (for events).
   */
  static get observedAttributes() {
    // Visual attributes for Carbon button
    const visualAttrs = ['kind', 'size', 'disabled', 'href'];

    // Semantic attributes for Zooy events (not forwarded, just observed)
    return [...visualAttrs, ...SEMANTIC_ATTRIBUTES];
  }

  /**
   * Render the Carbon button inside this element
   */
  render() {
    // Create Carbon button if it doesn't exist
    if (!this._carbonButton) {
      this._carbonButton = document.createElement('cds-button');

      // Move all children into the Carbon button
      while (this.firstChild) {
        this._carbonButton.appendChild(this.firstChild);
      }

      // Append Carbon button to this element
      this.appendChild(this._carbonButton);
    }

    this.updateCarbonButton();
  }

  /**
   * Update the Carbon button with current visual attributes.
   * Note: Semantic event attributes (event, record-id, endpoint, etc.)
   * are NOT forwarded - they stay on the zoo-button wrapper.
   * Panel renderers read semantic attributes from the wrapper element.
   */
  updateCarbonButton() {
    if (!this._carbonButton) return;

    // Forward only visual/functional attributes to Carbon button
    const visualAttrs = ['kind', 'size', 'disabled', 'href'];
    visualAttrs.forEach(attr => {
      if (this.hasAttribute(attr)) {
        this._carbonButton.setAttribute(attr, this.getAttribute(attr));
      } else {
        this._carbonButton.removeAttribute(attr);
      }
    });

    // Semantic attributes (event, record-id, endpoint, etc.) are NOT forwarded.
    // They're read from the zoo-button wrapper by Panel renderers.
  }

  /**
   * Get the underlying Carbon button element
   * Used by Panel render functions to attach event listeners
   */
  get carbonElement() {
    return this._carbonButton;
  }
}

// Register the custom element
customElements.define('zoo-button', ZooButton);
