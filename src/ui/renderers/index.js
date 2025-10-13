/**
 * Carbon Design System Integration
 *
 * This module provides integration between Zooy panels and IBM Carbon Design
 * System Web Components using a configuration-driven approach.
 *
 * The generic renderer in carbon.js handles all component types through
 * a declarative configuration, eliminating the need for individual renderer files.
 *
 * Carbon Web Components auto-initialize, so we don't need to manually
 * instantiate them like we did with MDC.
 *
 * Migration from MDC to Carbon:
 * - MDC used imperative JS initialization: new mdc.button.MDCButton(el)
 * - Carbon uses declarative Web Components: <cds-button> (auto-initializes)
 *
 * @see https://web-components.carbondesignsystem.com/
 */

import { renderCarbonComponents } from './carbon.js';

export { renderCarbonComponents };

/**
 * Loads Carbon Web Components dynamically.
 * This ensures components are registered with the browser before we try to use them.
 *
 * @returns {Promise<void>}
 */
export const loadCarbonComponents = async () => {
  try {
    // Import only the components we're using (tree-shaking friendly)
    await import('@carbon/web-components/es/components/button/index.js');
    await import('@carbon/web-components/es/components/text-input/index.js');
    await import('@carbon/web-components/es/components/dropdown/index.js');
    await import('@carbon/web-components/es/components/checkbox/index.js');
    await import('@carbon/web-components/es/components/radio-button/index.js');
    await import('@carbon/web-components/es/components/modal/index.js');
    await import('@carbon/web-components/es/components/data-table/index.js');
    await import('@carbon/web-components/es/components/tabs/index.js');
    await import('@carbon/web-components/es/components/overflow-menu/index.js');
    await import('@carbon/web-components/es/components/structured-list/index.js');
    await import('@carbon/web-components/es/components/toggle/index.js');
    await import('@carbon/web-components/es/components/tag/index.js');
    await import('@carbon/web-components/es/components/select/index.js');
    await import('@carbon/web-components/es/components/slider/index.js');
    await import('@carbon/web-components/es/components/progress-bar/index.js');

    // console.log('[Zooy] Carbon Web Components loaded successfully');
  } catch (error) {
    console.error('[Zooy] Failed to load Carbon Web Components:', error);
    throw error;
  }
};

/**
 * Initialize all Carbon components in a panel.
 * This is called from Panel.parseContent() after the panel DOM is in the document.
 *
 * @param {Element} panel - The panel element
 * @this {Panel} - The panel instance (bound via .call())
 * @returns {Promise<void>}
 */
export const initializeCarbonComponents = async function(panel) {
  try {
    // Load Carbon Web Components if not already loaded
    await loadCarbonComponents();

    // Render all components using the generic configuration-driven renderer
    renderCarbonComponents.call(this, panel);

    this.debugMe('Carbon components initialized in panel');
  } catch (error) {
    console.error('[Zooy] Error initializing Carbon components:', error);
    // Don't throw - fail gracefully, panel should still work
  }
};
