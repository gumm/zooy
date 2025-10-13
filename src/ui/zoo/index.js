/**
 * Zooy UI Components
 *
 * Custom Web Component wrappers around Carbon Design System components.
 * These provide a Zooy-specific API and make it easier to switch UI libraries
 * in the future without changing application templates.
 *
 * Benefits:
 * - Cleaner, more semantic HTML (<zoo-button> vs <cds-button>)
 * - Abstraction layer for easier library migration
 * - Zooy-specific defaults and styling
 * - Automatic integration with Panel event system
 *
 * Usage in templates:
 *   <zoo-button data-zv="event_name" kind="primary">Click Me</zoo-button>
 *   <zoo-text-input data-zv="input_changed" label="Username"></zoo-text-input>
 *   <zoo-dropdown data-zv="selection_changed" label="Choose option">
 *     <cds-dropdown-item value="1">Option 1</cds-dropdown-item>
 *   </zoo-dropdown>
 *
 * All zoo-* components:
 * - Accept all standard Carbon component attributes
 * - Forward all data-* attributes for Zooy event system
 * - Expose .carbonElement property for Panel renderers
 * - Self-register as custom elements when imported
 *
 * @see /home/gumm/Workspace/zooy/src/ui/carbon/index.js for Carbon integration
 */

// Import components (they self-register via customElements.define)
import { ZooButton } from './button.js';
import { ZooTextInput } from './text-input.js';
import { ZooDropdown } from './dropdown.js';
import { ZooCheckbox } from './checkbox.js';
import { ZooRadioButton, ZooRadioButtonGroup } from './radio-button.js';
import { ZooModal } from './modal.js';

// Export for programmatic access if needed
export {
  ZooButton,
  ZooTextInput,
  ZooDropdown,
  ZooCheckbox,
  ZooRadioButton,
  ZooRadioButtonGroup,
  ZooModal
};

/**
 * Ensure all Zooy components are registered.
 * This is called automatically when this module is imported.
 * Components register themselves, so this is mostly for documentation.
 *
 * Registered components:
 * - <zoo-button>
 * - <zoo-text-input>
 * - <zoo-dropdown>
 * - <zoo-checkbox>
 * - <zoo-radio-button>
 * - <zoo-radio-button-group>
 * - <zoo-modal>
 */
export const registerZooComponents = () => {
  // Components self-register via customElements.define() in their respective files
  // This function exists for explicit initialization if needed
  // console.log('[Zooy] Zoo components registered');
};

// Auto-register on import
registerZooComponents();
