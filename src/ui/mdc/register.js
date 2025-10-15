/**
 * Google Material Design Components (MDC) Library Registration
 *
 * This module wraps the existing MDC integration code into the pluggable
 * component library architecture. This is an interim solution that allows
 * MDC to coexist with Carbon while we gradually migrate away from it.
 *
 * The internal MDC code remains unchanged - this just wraps it for the registry.
 *
 * Usage:
 *   import { registerMdcLibrary } from './ui/mdc/register.js';
 *   registerMdcLibrary();
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
 * Registers the MDC library with the ComponentLibraryRegistry.
 * This enables MDC components to be initialized in panels.
 *
 * Call this once at application startup if you need MDC support.
 *
 * @example
 * import { registerMdcLibrary } from './ui/mdc/register.js';
 * registerMdcLibrary();
 */
export function registerMdcLibrary() {
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
