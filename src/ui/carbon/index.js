/**
 * Carbon Design System Integration
 *
 * This module provides integration between Zooy panels and IBM Carbon Design
 * System Web Components. Each component file exports a render function that:
 * 1. Finds Carbon Web Components in the panel DOM
 * 2. Attaches Zooy event listeners
 * 3. Manages component lifecycle
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

import { renderButtons } from './button.js';
import { renderTextInputs } from './text-input.js';
import { renderDropdowns } from './dropdown.js';
import { renderCheckboxes } from './checkbox.js';
import { renderRadioButtons } from './radio-button.js';
import { renderModals } from './modal.js';

export {
  renderButtons,
  renderTextInputs,
  renderDropdowns,
  renderCheckboxes,
  renderRadioButtons,
  renderModals
};

// Additional components can be added here as we continue migration:
// export { renderDataTables } from './data-table.js';
// export { renderTabs } from './tabs.js';
// export { renderToggles } from './toggle.js';
// etc.

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

    // Future imports will be added here as we continue migration:
    // await import('@carbon/web-components/es/components/data-table/index.js');
    // await import('@carbon/web-components/es/components/tabs/index.js');
    // await import('@carbon/web-components/es/components/toggle/index.js');
    // etc.

    console.log('[Zooy] Carbon Web Components loaded successfully');
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

    // Render each component type
    renderButtons.call(this, panel);
    renderTextInputs.call(this, panel);
    renderDropdowns.call(this, panel);
    renderCheckboxes.call(this, panel);
    renderRadioButtons.call(this, panel);
    renderModals.call(this, panel);

    // Future component renderers will be called here as we continue migration:
    // renderDataTables.call(this, panel);
    // renderTabs.call(this, panel);
    // renderToggles.call(this, panel);
    // etc.

    this.debugMe('Carbon components initialized in panel');
  } catch (error) {
    console.error('[Zooy] Error initializing Carbon components:', error);
    // Don't throw - fail gracefully, panel should still work
  }
};
