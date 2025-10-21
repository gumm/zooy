/**
 * Google Material Design Components (MDC) Library Registration
 *
 * This module wraps the existing MDC integration code into the pluggable
 * component library architecture. This is an interim solution that allows
 * MDC to coexist with Carbon while we gradually migrate away from it.
 *
 * The internal MDC code remains unchanged - this just wraps it for the registry.
 *
 * Features:
 * - Dynamically loads material-components-web.js (no script tags needed!)
 * - Self-contained plugin (all dependencies loaded by the plugin itself)
 * - Promise-based loading with caching (loads once, shared globally)
 * - Configurable CDN URL via window.__MDC_CDN_URL__
 *
 * Usage:
 *   import { registerMdcLibrary } from './ui/mdc/register.js';
 *   await registerMdcLibrary();  // Now async!
 */

import { ComponentLibraryRegistry } from '../component-library-registry.js';
import { isDefAndNotNull } from 'badu';
import {
  renderButtons as renderMdcButtons,
  renderCheckBoxes,
  renderChips,
  renderDataTables,
  renderFloatingActionButtons,
  renderFormFields,
  renderIconButtons,
  renderIconToggleButtons,
  renderLinearProgress,
  renderLists,
  renderMenus,
  renderMenuSurfaces,
  renderRadioButtons,
  renderRipples,
  renderSelectMenus,
  renderSliders,
  renderSwitches,
  renderTabBars,
  renderTextFieldIcons,
  renderTextFields
} from './mdc.js';
import * as treeUtils from './tree-utils.js';

/**
 * Cached promise for loading material-components-web.js
 * Ensures we only load the library once, even if registerMdcLibrary() is called multiple times
 * @type {Promise<void>|null}
 */
let mdcLoadPromise = null;

/**
 * Dynamically loads material-components-web.js and waits for window.mdc to be available.
 * Uses a cached promise to ensure the library is only loaded once.
 *
 * @returns {Promise<void>} Resolves when window.mdc is ready
 */
function loadMdcLibrary() {
  console.debug('[MDC Plugin] loadMdcLibrary() called');

  // Return cached promise if already loading/loaded
  if (mdcLoadPromise) {
    return mdcLoadPromise;
  }

  // Check if already loaded (e.g., via script tag in template)
  if (isDefAndNotNull(window.mdc) &&
      Object.prototype.hasOwnProperty.call(window.mdc, 'autoInit')) {
    mdcLoadPromise = Promise.resolve();
    return mdcLoadPromise;
  }

  // Create and cache the loading promise
  mdcLoadPromise = new Promise((resolve, reject) => {
    // Allow customization of CDN URL via global variable (useful for local development)
    const cdnUrl = window.__MDC_CDN_URL__ ||
                   'https://unpkg.com/material-components-web@14.0.0/dist/material-components-web.min.js';

    const script = document.createElement('script');
    script.src = cdnUrl;
    script.async = true;

    script.onload = () => {
      // Verify window.mdc is available
      if (isDefAndNotNull(window.mdc) &&
          Object.prototype.hasOwnProperty.call(window.mdc, 'autoInit')) {
        resolve();
      } else {
        reject(new Error('MDC library loaded but window.mdc is not available'));
      }
    };

    script.onerror = () => {
      reject(new Error(`Failed to load MDC library from ${cdnUrl}`));
    };

    document.head.appendChild(script);
  });

  return mdcLoadPromise;
}

/**
 * Registers the MDC library with the ComponentLibraryRegistry.
 * This enables MDC components to be initialized in panels.
 *
 * Call this once at application startup if you need MDC support.
 *
 * @returns {Promise<void>} Resolves when MDC library is loaded and registered
 *
 * @example
 * import { registerMdcLibrary } from './ui/mdc/register.js';
 * await registerMdcLibrary();  // Now async - waits for library to load
 */
export async function registerMdcLibrary() {

  // Load the MDC library before registering
  try {
    await loadMdcLibrary();
  } catch (error) {
    throw error;
  }

  ComponentLibraryRegistry.register('mdc', {
    /**
     * Renders all MDC components in a panel.
     * This is the exact same logic that was previously in Panel.parseContent(),
     * just extracted into a separate module.
     *
     * @param {Element} panel - The panel DOM element to scan and initialize
     * @param {Map} _cache - Unused (MDC doesn't use dynamic imports)
     */
    render: function(panel, _cache) {
      // Legacy MDC support (synchronous initialization)
      // Requires window.mdc to be loaded globally (not ESM)
      if (isDefAndNotNull(window.mdc) &&
          Object.prototype.hasOwnProperty.call(window.mdc, 'autoInit')) {

        renderRipples.call(this, panel);
        renderMdcButtons.call(this, panel);
        renderFloatingActionButtons.call(this, panel);
        renderIconButtons.call(this, panel);
        renderIconToggleButtons.call(this, panel);
        renderTabBars.call(this, panel);
        renderSwitches.call(this, panel);
        renderChips.call(this, panel);
        renderMenuSurfaces.call(this, panel);
        renderMenus.call(this, panel);
        renderLists.call(this, panel);
        renderSliders.call(this, panel);
        renderLinearProgress.call(this, panel);
        renderFormFields.call(this, panel);
        renderSelectMenus.call(this, panel, this);
        renderTextFieldIcons.call(this, panel);
        renderTextFields.call(this, panel);
        renderRadioButtons.call(this, panel);
        renderCheckBoxes.call(this, panel);
        renderDataTables.call(this, panel);
      }
    },

    /**
     * Cleans up MDC components when a component is disposed.
     * This is the cleanup logic that was previously in Component.dispose(),
     * now extracted into the MDC library registration.
     *
     * @param {Element} element - The element being disposed
     */
    dispose: function(element) {
      const els = element.querySelectorAll('[data-mdc-auto-init]');
      [...els].forEach(e => {
        try {
          e[e.getAttribute('data-mdc-auto-init')].destroy();
        } catch (error) {
          // MDC cleanup errors are expected during disposal
          // Component may have been partially initialized or already cleaned up
        }
      });
    },

    config: {
      version: '1.0',
      description: 'Google Material Design Components (legacy, being phased out)'
    },

    /**
     * MDC-specific utilities exposed for use in applications.
     * These are tightly coupled to MDC DOM structures.
     */
    utils: treeUtils
  });

  console.debug('[Zooy] MDC library registered');
}
