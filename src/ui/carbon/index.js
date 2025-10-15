/**
 * Carbon Design System Integration
 *
 * This module provides integration between Zooy panels and IBM Carbon Design
 * System Web Components using a configuration-driven, lazy-loading approach.
 *
 * Features:
 * - Lazy loading: Only imports components actually used in each panel
 * - Automatic caching: Modules loaded once, shared across all panels
 * - Progressive enhancement: Components load as panels are rendered
 * - Configuration-driven: Single source of truth for all integrations
 *
 * Carbon Web Components auto-initialize when imported, so we don't need to
 * manually instantiate them like we did with MDC.
 *
 * Migration from MDC to Carbon:
 * - MDC used imperative JS initialization: new mdc.button.MDCButton(el)
 * - Carbon uses declarative Web Components: <cds-button> (auto-initializes)
 *
 * @see https://web-components.carbondesignsystem.com/
 */

import { renderCarbonComponents } from './renderers.js';
import { loadCarbonIcons } from './icons.js';

export { renderCarbonComponents, loadCarbonIcons };

/**
 * Initialize all Carbon components in a panel with lazy loading.
 * This is called from Panel.parseContent() after the panel DOM is in the document.
 *
 * Flow:
 * 1. Scan panel DOM for Carbon components
 * 2. Dynamically import only the components detected
 * 3. Attach Zooy event listeners to components
 * 4. Load Carbon icon sprites
 *
 * @param {Element} panel - The panel element
 * @this {Panel} - The panel instance (bound via .call())
 * @returns {Promise<void>}
 */
export const initializeCarbonComponents = async function(panel) {
  try {
    // Lazy load components and attach event listeners
    // renderCarbonComponents now handles import detection and loading
    await renderCarbonComponents.call(this, panel);

    // Load Carbon icons (replaces placeholders with actual SVG icons)
    await loadCarbonIcons();

    this.debugMe('[Carbon] Components initialized in panel');
  } catch (error) {
    console.error('[Zooy] Error initializing Carbon components:', error);
    // Don't throw - fail gracefully, panel should still work
  }
};
