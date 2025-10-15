/**
 * Carbon Design System Library Registration
 *
 * This module provides the registration function for integrating Carbon Design System
 * with the Zooy framework's pluggable component architecture.
 *
 * Usage:
 *   import { registerCarbonLibrary } from './ui/carbon/register.js';
 *   registerCarbonLibrary();
 */

import { ComponentLibraryRegistry } from '../component-library-registry.js';
import { renderCarbonComponents } from './renderers.js';
import { loadCarbonIcons } from './icons.js';

/**
 * Registers the Carbon Design System library with the ComponentLibraryRegistry.
 * This enables automatic lazy-loading of Carbon components in panels.
 *
 * Call this once at application startup.
 *
 * @example
 * import { registerCarbonLibrary } from './ui/carbon/register.js';
 * registerCarbonLibrary();
 */
export function registerCarbonLibrary() {
  ComponentLibraryRegistry.register('carbon', {
    /**
     * Main render function that orchestrates Carbon component initialization.
     * Called by Panel.parseContent() for each panel that enters the document.
     *
     * @param {Element} panel - The panel DOM element to scan and initialize
     * @param {Map} cache - Import cache to prevent duplicate module loads
     * @returns {Promise<void>}
     */
    render: async function(panel, cache) {
      try {
        // Step 1-4: Scan, collect, load, and attach
        // renderCarbonComponents handles the complete flow internally
        await renderCarbonComponents.call(this, panel, cache);

        // Load Carbon icon sprites (replaces placeholders with actual SVG icons)
        await loadCarbonIcons();

        this.debugMe('[Carbon] Components initialized successfully');
      } catch (error) {
        console.error('[Carbon] Initialization error:', error);
        // Fail gracefully - panel should still work without Carbon components
      }
    },

    /**
     * Cleans up Carbon components when a component is disposed.
     * Carbon Web Components (native web components) automatically cleanup when
     * removed from the DOM, so this is primarily here for completeness and
     * future extensibility.
     *
     * @param {Element} _element - The element being disposed
     */
    dispose: function(_element) {
      // Carbon Web Components are native web components and handle their own
      // cleanup via disconnectedCallback(). No manual cleanup needed.
      //
      // Future: If we add event listeners outside the components, clean them here
    },

    config: {
      version: '2.0',
      description: 'IBM Carbon Design System Web Components'
    }
  });

  console.debug('[Zooy] Carbon Design System library registered');
}
