// noinspection JSFileReferences

/**
 * Generic Carbon Design System Component Renderer
 *
 * Configuration-driven approach to attach event listeners to Carbon components.
 * This single renderer replaces 18 individual component renderers with a
 * declarative configuration.
 *
 * Features:
 * - Single source of truth for all Carbon component integrations
 * - Lazy loading - only imports components that are actually used in the panel
 * - Automatic import caching - modules loaded once, shared across all panels
 * - Easy to add new components - just add configuration
 * - Consistent event handling patterns
 * - Reduced code duplication
 * - Future-proof - doesn't depend on Carbon internals
 *
 * @see https://web-components.carbondesignsystem.com/
 */

import {getSemanticAttributes, getEventAttribute} from '../zoo/attributes.js';

//--------------------------------------------------------------[ Lazy Imports ]--
// Shared import functions for Carbon Web Components
// These are referenced by COMPONENT_CONFIG and cached globally
// Components from the same package share the same import function

const headingImport = () => import('@carbon/web-components/es/components/heading/index.js');
const iconImport = () => import('@carbon/web-components/es/components/icon/index.js');
const iconButtonImport = () => import('@carbon/web-components/es/components/icon-button/index.js');
const iconIndicatorImport = () => import('@carbon/web-components/es/components/icon-indicator/index.js');
const linkImport = () => import('@carbon/web-components/es/components/link/index.js');
const buttonImport = () => import('@carbon/web-components/es/components/button/index.js');
const comboButtonImport = () => import('@carbon/web-components/es/components/combo-button/index.js');
const copyButtonImport = () => import('@carbon/web-components/es/components/copy-button/index.js');
const badgeIndicatorImport = () => import('@carbon/web-components/es/components/badge-indicator/index.js');

const formImport = () => import('@carbon/web-components/es/components/form/index.js');
const formGroupImport = () => import('@carbon/web-components/es/components/form-group/index.js');
const stackImport = () => import('@carbon/web-components/es/components/stack/index.js');

const textInputImport = () => import('@carbon/web-components/es/components/text-input/index.js');
const textareaImport = () => import('@carbon/web-components/es/components/textarea/index.js');
const numberInputImport = () => import('@carbon/web-components/es/components/number-input/index.js');
const passwordInputImport = () => import('@carbon/web-components/es/components/password-input/index.js');
const searchImport = () => import('@carbon/web-components/es/components/search/index.js');
const dropdownImport = () => import('@carbon/web-components/es/components/dropdown/index.js');
const comboBoxImport = () => import('@carbon/web-components/es/components/combo-box/index.js');
const multiSelectImport = () => import('@carbon/web-components/es/components/multi-select/index.js');
const checkboxImport = () => import('@carbon/web-components/es/components/checkbox/index.js');
const radioButtonImport = () => import('@carbon/web-components/es/components/radio-button/index.js');
const selectImport = () => import('@carbon/web-components/es/components/select/index.js');
const toggleImport = () => import('@carbon/web-components/es/components/toggle/index.js');
const sliderImport = () => import('@carbon/web-components/es/components/slider/index.js');
const datePickerImport = () => import('@carbon/web-components/es/components/date-picker/index.js');
const timePickerImport = () => import('@carbon/web-components/es/components/time-picker/index.js');
const fileUploaderImport = () => import('@carbon/web-components/es/components/file-uploader/index.js');

const breadcrumbImport = () => import('@carbon/web-components/es/components/breadcrumb/index.js');
const paginationImport = () => import('@carbon/web-components/es/components/pagination/index.js');
const tabsImport = () => import('@carbon/web-components/es/components/tabs/index.js');
const contentSwitcherImport = () => import('@carbon/web-components/es/components/content-switcher/index.js');
const accordionImport = () => import('@carbon/web-components/es/components/accordion/index.js');

const modalImport = () => import('@carbon/web-components/es/components/modal/index.js');
const dataTableImport = () => import('@carbon/web-components/es/components/data-table/index.js');
const overflowMenuImport = () => import('@carbon/web-components/es/components/overflow-menu/index.js');
const structuredListImport = () => import('@carbon/web-components/es/components/structured-list/index.js');
const tagImport = () => import('@carbon/web-components/es/components/tag/index.js');
const progressBarImport = () => import('@carbon/web-components/es/components/progress-bar/index.js');

const treeViewImport = () => import('@carbon/web-components/es/components/tree-view/index.js');
const tooltipImport = () => import('@carbon/web-components/es/components/tooltip/index.js');
const popoverImport = () => import('@carbon/web-components/es/components/popover/index.js');
const notificationImport = () => import('@carbon/web-components/es/components/notification/index.js');
const codeSnippetImport = () => import('@carbon/web-components/es/components/code-snippet/index.js');
const loadingImport = () => import('@carbon/web-components/es/components/loading/index.js');
const inlineLoadingImport = () => import('@carbon/web-components/es/components/inline-loading/index.js');
const skeletonTextImport = () => import('@carbon/web-components/es/components/skeleton-text/index.js');
const skeletonPlaceholderImport = () => import('@carbon/web-components/es/components/skeleton-placeholder/index.js');
const tileImport = () => import('@carbon/web-components/es/components/tile/index.js');
const progressIndicatorImport = () => import('@carbon/web-components/es/components/progress-indicator/index.js');
const toggleTipImport = () => import('@carbon/web-components/es/components/toggle-tip/index.js');
const menuImport = () => import('@carbon/web-components/es/components/menu/index.js');

//-------------------------------------------------------[ Helper Functions ]--

/**
 * Scans panel DOM once and categorizes all Carbon elements by their config selector.
 * This single-pass approach is much faster than calling querySelectorAll for each selector.
 *
 * @param {Element} panel - The panel element to scan
 * @returns {Map<string, Element[]>} Map of selector → matching elements
 * @export For unit testing
 */
export function scanForCarbonComponents(panel) {
  const elementMap = new Map();

  // Initialize map with all selectors
  for (const selector of Object.keys(COMPONENT_CONFIG)) {
    elementMap.set(selector, []);
  }

  // Check the panel element itself first (it might be a Carbon component)
  for (const [selector, config] of Object.entries(COMPONENT_CONFIG)) {
    if (panel.matches(selector)) {
      elementMap.get(selector).push(panel);
    }
  }

  // Single DOM traversal - categorize descendant elements by matching selectors
  const allElements = panel.querySelectorAll('*');
  for (const element of allElements) {
    for (const [selector, config] of Object.entries(COMPONENT_CONFIG)) {
      if (element.matches(selector)) {
        elementMap.get(selector).push(element);
      }
    }
  }

  // Remove empty entries
  for (const [selector, elements] of elementMap.entries()) {
    if (elements.length === 0) {
      elementMap.delete(selector);
    }
  }

  return elementMap;
}

/**
 * Collects unique import functions needed based on scanned elements.
 *
 * @param {Map<string, Element[]>} elementMap - Map from scanForCarbonComponents
 * @returns {Set<Function>} Set of unique import functions to load
 * @export For unit testing
 */
export function collectImportsNeeded(elementMap) {
  const importsNeeded = new Set();

  for (const [selector, elements] of elementMap.entries()) {
    const config = COMPONENT_CONFIG[selector];
    if (config && config.import && elements.length > 0) {
      importsNeeded.add(config.import);
    }
  }

  return importsNeeded;
}

/**
 * Loads component imports in parallel with caching.
 *
 * @param {Set<Function>} importFunctions - Set of import functions to load
 * @param {Map<Function, Promise>} cache - External cache for imports (from Conductor)
 * @returns {Promise<void>}
 * @export For unit testing
 */
export async function loadComponentImports(importFunctions, cache) {
  if (importFunctions.size === 0) {
    return;
  }

  const loadPromises = Array.from(importFunctions).map(async (importFn) => {
    // Check cache first
    if (!cache.has(importFn)) {
      // Not cached - load and cache the promise
      cache.set(importFn, importFn());
    }
    // Return cached promise (may be in-flight or completed)
    return cache.get(importFn);
  });

  await Promise.all(loadPromises);
}

/**
 * Attaches event listeners to Carbon components based on their configuration.
 *
 * @param {Map<string, Element[]>} elementMap - Map of selector → elements
 * @param {Panel} panel - The panel instance for event dispatching
 * @returns {number} Total number of components initialized
 * @export For unit testing
 */
export function attachEventListeners(elementMap, panel) {
  console.log('[Carbon] attachEventListeners called with', elementMap.size, 'component types');
  let totalInitialized = 0;

  for (const [selector, elements] of elementMap.entries()) {
    console.log('[Carbon] Processing selector:', selector, 'with', elements.length, 'elements');
    const config = COMPONENT_CONFIG[selector];

    elements.forEach(element => {
      console.log('[Carbon] Initializing element:', selector, element);
      // Custom initialization (for complex components)
      if (config.init) {
        config.init.call(panel, element);
        return;
      }

      // Multi-event components (e.g., text-input with input + change)
      if (config.multiEvent) {
        const attrs = getSemanticAttributes(element);
        config.events.forEach(eventConfig => {
          const eventName = getEventAttribute(element, eventConfig.attrName, 'event');
          if (eventName) {
            panel.listen(element, eventConfig.type, e => {
              panel.dispatchPanelEvent(eventName, eventConfig.getData(e, attrs, element));
            });
          }
        });
        return;
      }

      // Standard single-event components
      const attrs = getSemanticAttributes(element);
      const eventName = attrs.event;

      if (eventName) {
        panel.listen(element, config.event, e => {
          e.stopPropagation();
          const data = config.getData(e, attrs, element);

          // Handle event override (e.g., menu items with their own event names)
          const finalEventName = data._eventOverride || eventName;
          delete data._eventOverride;

          panel.dispatchPanelEvent(finalEventName, data);
        });
      }
    });

    totalInitialized += elements.length;
    panel.debugMe(`[Carbon] Initialized ${elements.length} ${selector} component(s)`);
  }

  return totalInitialized;
}

/**
 * Component configuration
 * Each entry defines how to integrate a Carbon component with Panel events
 *
 * Configuration options:
 * - event: Native or custom event name to listen for
 * - getData: Function to extract data from event (receives event, attrs, element)
 * - init: Optional custom initialization function
 * - multiEvent: For components with multiple event types
 */
const COMPONENT_CONFIG = {
  // Form structure components (presentational only - no event handling needed)
  'cds-form': {
    import: formImport
    // No event handling - wraps native <form> which works naturally
  },

  'cds-form-item': {
    import: formImport
    // No event handling - presentational wrapper for form fields
  },

  'cds-form-group': {
    import: formGroupImport
    // No event handling - presentational fieldset wrapper
  },

  'cds-stack': {
    import: stackImport
    // No event handling - layout utility for spacing items vertically or horizontally
  },

  // Buttons
  'cds-button': {
    import: buttonImport,
    init: function (button) {
      const attrs = getSemanticAttributes(button);
      const buttonType = button.getAttribute('type');

      // Submit buttons need special handling because Carbon button's native <button>
      // is inside shadow DOM, which breaks the form submission mechanism.
      // We manually trigger form submission on the associated form.
      if (buttonType === 'submit') {
        this.listen(button, 'click', e => {
          // Find the form - either as ancestor or via HTML5 form attribute
          let form = button.closest('form');

          // If button is outside form (e.g., in modal footer), check form attribute
          if (!form) {
            const formId = button.getAttribute('form');
            if (formId) {
              form = document.getElementById(formId);
            }
          }

          if (form) {
            // Use requestSubmit() which properly triggers validation and submit event
            // FormPanel's interceptFormSubmit() will catch this and handle it
            form.requestSubmit();
          }
        });
        return;
      }

      // Standard button event handling (for non-submit buttons)
      const eventName = attrs.event;
      if (eventName) {
        this.listen(button, 'click', e => {
          e.stopPropagation();
          this.dispatchPanelEvent(eventName, attrs);
        });
      }
    }
  },

  'cds-icon-button': {
    import: iconButtonImport,
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // FAB (Floating Action Button) - just a styled button
  'cds-button[data-fab="true"]': {
    import: buttonImport,
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // Icon Toggle - manual state management with visual feedback
  'cds-icon-button[data-toggle="true"]': {
    import: iconButtonImport,
    init: function (button) {
      const attrs = getSemanticAttributes(button);

      // Apply visual styling based on selected state
      const updateVisualState = () => {
        const isSelected = button.hasAttribute('is-selected');
        const svg = button.querySelector('svg[slot="icon"]');

        if (svg) {
          if (isSelected) {
            // Selected state: filled icon with primary color
            svg.style.fill = 'var(--cds-icon-primary, #0f62fe)';
            svg.style.opacity = '1';
          } else {
            // Unselected state: outlined with muted color
            svg.style.fill = 'currentColor';
            svg.style.opacity = '0.75';
          }
        }
      };

      // Set initial visual state
      updateVisualState();

      // Listen for clicks
      if (attrs.event) {
        this.listen(button, 'click', e => {
          e.stopPropagation();

          // Toggle is-selected attribute
          const isSelected = button.hasAttribute('is-selected');
          if (isSelected) {
            button.removeAttribute('is-selected');
          } else {
            button.setAttribute('is-selected', '');
          }

          // Update visual state
          updateVisualState();

          this.dispatchPanelEvent(attrs.event, {
            ...attrs,
            isOn: !isSelected
          });
        });
      }
    }
  },

  // Text Input
  'cds-text-input': {
    import: textInputImport,
    multiEvent: true,
    events: [
      {
        type: 'input',
        attrName: 'event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      },
      {
        type: 'change',
        attrName: 'change-event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      }
    ]
  },

  // Text Area
  'cds-textarea': {
    import: textareaImport,
    multiEvent: true,
    events: [
      {
        type: 'input',
        attrName: 'event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      },
      {
        type: 'change',
        attrName: 'change-event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      }
    ]
  },

  // Number Input
  'cds-number-input': {
    import: numberInputImport,
    event: 'cds-number-input',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: e.detail.value,
      direction: e.detail.direction  // 'up' or 'down' when using steppers
    })
  },

  // Password Input
  'cds-password-input': {
    import: passwordInputImport,
    multiEvent: true,
    events: [
      {
        type: 'input',
        attrName: 'event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      },
      {
        type: 'change',
        attrName: 'change-event',
        getData: (e, attrs) => ({
          ...attrs,
          value: e.currentTarget.value
        })
      }
    ]
  },

  // Search
  'cds-search': {
    import: searchImport,
    event: 'cds-search-input',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: element.value
    })
  },

  // Combo Box
  'cds-combo-box': {
    import: comboBoxImport,
    init: function (comboBox) {
      const attrs = getSemanticAttributes(comboBox);

      // Selection event (when item is selected)
      const selectionEvent = attrs.event;
      if (selectionEvent) {
        this.listen(comboBox, 'cds-combo-box-selected', e => {
          this.dispatchPanelEvent(selectionEvent, {
            ...attrs,
            value: comboBox.value,
            selectedItem: e.detail?.item
          });
        });
      }

      // Toggle event (when combo box opens/closes)
      const toggleEvent = comboBox.getAttribute('toggle-event');
      if (toggleEvent) {
        this.listen(comboBox, 'cds-combo-box-toggled', e => {
          this.dispatchPanelEvent(toggleEvent, {
            ...attrs,
            open: comboBox.hasAttribute('open')
          });
        });
      }
    }
  },

  // Multi Select
  'cds-multi-select': {
    import: multiSelectImport,
    init: function (multiSelect) {
      const attrs = getSemanticAttributes(multiSelect);

      // Selection event (when items are selected/deselected)
      const selectionEvent = attrs.event;
      if (selectionEvent) {
        this.listen(multiSelect, 'cds-multi-select-selected', e => {
          this.dispatchPanelEvent(selectionEvent, {
            ...attrs,
            selectedItems: multiSelect.value
          });
        });
      }

      // Toggle event (when multi-select opens/closes)
      const toggleEvent = multiSelect.getAttribute('toggle-event');
      if (toggleEvent) {
        this.listen(multiSelect, 'cds-multi-select-toggled', e => {
          this.dispatchPanelEvent(toggleEvent, {
            ...attrs,
            open: multiSelect.hasAttribute('open')
          });
        });
      }
    }
  },

  // Date Picker
  'cds-date-picker': {
    import: datePickerImport,
    init: function (datePicker) {
      const attrs = getSemanticAttributes(datePicker);

      // Value change event (when date is selected)
      const changeEvent = attrs.event;
      if (changeEvent) {
        this.listen(datePicker, 'cds-date-picker-changed', e => {
          this.dispatchPanelEvent(changeEvent, {
            ...attrs,
            value: datePicker.value
          });
        });
      }

      // Error event (when Flatpickr encounters an error)
      const errorEvent = datePicker.getAttribute('error-event');
      if (errorEvent) {
        this.listen(datePicker, 'cds-date-picker-flatpickr-error', e => {
          this.dispatchPanelEvent(errorEvent, {
            ...attrs,
            error: e.detail
          });
        });
      }
    }
  },

  // Time Picker
  'cds-time-picker': {
    import: timePickerImport,
    event: 'cds-time-picker-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: element.value
    })
  },

  // File Uploader
  'cds-file-uploader': {
    import: fileUploaderImport,
    init: function (uploader) {
      const attrs = getSemanticAttributes(uploader);

      // File selection event (when files are added via file dialog)
      const changeEvent = attrs.event;
      if (changeEvent) {
        // Listen for native change event on the input element
        const input = uploader.querySelector('input[type="file"]');
        if (input) {
          this.listen(input, 'change', e => {
            this.dispatchPanelEvent(changeEvent, {
              ...attrs,
              files: Array.from(e.target.files || [])
            });
          });
        }
      }

      // File deletion event (when individual file items are deleted)
      const deleteEvent = uploader.getAttribute('delete-event');
      if (deleteEvent) {
        this.listen(uploader, 'cds-file-uploader-item-deleted', e => {
          this.dispatchPanelEvent(deleteEvent, {
            ...attrs,
            fileName: e.detail?.fileName,
            fileId: e.detail?.fileId
          });
        });
      }
    }
  },

  // Dropdown
  'cds-dropdown': {
    import: dropdownImport,
    init: function (dropdown) {
      const attrs = getSemanticAttributes(dropdown);

      // Selection event (when item is selected)
      const selectionEvent = attrs.event;
      if (selectionEvent) {
        this.listen(dropdown, 'cds-dropdown-selected', e => {
          this.dispatchPanelEvent(selectionEvent, {
            ...attrs,
            value: dropdown.value,
            selectedValue: e.detail?.item?.value,
            selectedText: e.detail?.item?.textContent?.trim()
          });
        });
      }

      // Toggle event (when dropdown opens/closes)
      const toggleEvent = dropdown.getAttribute('toggle-event');
      if (toggleEvent) {
        this.listen(dropdown, 'cds-dropdown-toggled', e => {
          this.dispatchPanelEvent(toggleEvent, {
            ...attrs,
            open: dropdown.hasAttribute('open')
          });
        });
      }
    }
  },

  // Checkbox - Carbon uses custom event
  'cds-checkbox': {
    import: checkboxImport,
    event: 'cds-checkbox-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      checked: e.detail.checked,
      value: element.value
    })
  },

  // Radio Button Group - only listen to the group, not individual buttons
  'cds-radio-button-group': {
    import: radioButtonImport,
    event: 'cds-radio-button-group-changed',
    getData: (e, attrs) => ({
      ...attrs,
      value: e.detail?.value
    })
  },

  // Toggle
  'cds-toggle': {
    import: toggleImport,
    event: 'cds-toggle-changed',
    getData: (e, attrs) => ({
      ...attrs,
      isOn: e.detail.checked,
      value: e.detail.checked
    })
  },

  // Select
  'cds-select': {
    import: selectImport,
    event: 'cds-select-selected',
    getData: (e, attrs) => ({
      ...attrs,
      value: e.detail.value
    })
  },

  // Slider
  'cds-slider': {
    import: sliderImport,
    init: function (slider) {
      const attrs = getSemanticAttributes(slider);

      // Slider change event (when slider handle is moved)
      const changeEvent = attrs.event;
      if (changeEvent) {
        this.listen(slider, 'cds-slider-changed', e => {
          this.dispatchPanelEvent(changeEvent, {
            ...attrs,
            value: e.detail.value
          });
        });
      }

      // Input change event (when slider's text input is changed)
      const inputEvent = slider.getAttribute('input-event');
      if (inputEvent) {
        this.listen(slider, 'cds-slider-input-changed', e => {
          this.dispatchPanelEvent(inputEvent, {
            ...attrs,
            value: e.detail.value
          });
        });
      }
    }
  },

  // Tags - regular tags (click only, not closeable)
  'cds-tag': {
    import: tagImport,
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // Dismissible tags (closeable tags with X button)
  'cds-dismissible-tag': {
    import: tagImport,
    init: function (tag) {
      const attrs = getSemanticAttributes(tag);

      // Click event (when tag body is clicked)
      const clickEvent = tag.getAttribute('click-event');
      if (clickEvent) {
        this.listen(tag, 'click', e => {
          // Don't fire if clicking the close button
          if (e.target.closest('button')) {
            return;
          }
          this.dispatchPanelEvent(clickEvent, {
            ...attrs
          });
        });
      }

      // Close event (when X button is clicked)
      const closeEvent = attrs.event;
      if (closeEvent) {
        this.listen(tag, 'cds-dismissible-tag-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }
    }
  },

  // Filter tags (closeable tags used for filters)
  'cds-filter-tag': {
    import: tagImport,
    event: 'cds-filter-tag-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'remove'
    })
  },

  // Tabs
  'cds-tabs': {
    import: tabsImport,
    init: function (tabs) {
      const attrs = getSemanticAttributes(tabs);

      // Before selection event (cancelable)
      const beforeSelectEvent = tabs.getAttribute('before-select-event');
      if (beforeSelectEvent) {
        this.listen(tabs, 'cds-tabs-beingselected', e => {
          this.dispatchPanelEvent(beforeSelectEvent, {
            ...attrs,
            tabValue: e.detail.value,
            cancelable: true
          });
        });
      }

      // After selection event
      const selectEvent = attrs.event;
      if (selectEvent) {
        this.listen(tabs, 'cds-tabs-selected', e => {
          const selectedTab = e.detail.item;
          const tabAttrs = getSemanticAttributes(selectedTab);
          this.dispatchPanelEvent(selectEvent, {
            ...attrs,
            ...tabAttrs,
            tabValue: e.detail.value
          });
        });
      }
    }
  },

  // Data Table - uses custom init for multiple event types
  'cds-table': {
    import: dataTableImport,
    init: function (table) {
      const attrs = getSemanticAttributes(table);

      // Row selection events (individual row selection)
      const selectionEvent = table.getAttribute('selection-event') || attrs.event;
      if (selectionEvent) {
        this.listen(table, 'cds-table-row-change-selection', e => {
          this.dispatchPanelEvent(selectionEvent, {
            ...attrs,
            selected: e.detail.selected,
            rowId: e.target.id
          });
        });
      }

      // Select all event (header checkbox)
      const selectAllEvent = table.getAttribute('select-all-event');
      if (selectAllEvent) {
        this.listen(table, 'cds-table-change-selection-all', e => {
          this.dispatchPanelEvent(selectAllEvent, {
            ...attrs,
            selected: e.detail.selected
          });
        });
      }

      // High-level synthetic events for easier data table integration
      const rowSelectedEvent = table.getAttribute('row-selected-event');
      if (rowSelectedEvent) {
        this.listen(table, 'cds-table-row-selected', e => {
          this.dispatchPanelEvent(rowSelectedEvent, {
            ...attrs,
            selectedRows: e.detail.selectedRows || []
          });
        });
      }

      const allSelectedEvent = table.getAttribute('all-selected-event');
      if (allSelectedEvent) {
        this.listen(table, 'cds-table-row-all-selected', e => {
          this.dispatchPanelEvent(allSelectedEvent, {
            ...attrs,
            selected: e.detail.selected
          });
        });
      }

      // Row click events
      const rows = [...table.querySelectorAll('cds-table-row')];
      rows.forEach(row => {
        const rowAttrs = getSemanticAttributes(row);
        const rowClickEvent = table.getAttribute('row-click-event') || rowAttrs.event;

        if (rowClickEvent) {
          this.listen(row, 'click', e => {
            // Don't fire if clicking on selection checkbox
            if (e.target.matches('cds-table-header-cell-checkbox, cds-table-cell-checkbox')) {
              return;
            }
            e.stopPropagation();
            this.dispatchPanelEvent(rowClickEvent, {
              ...attrs,
              ...rowAttrs,
              rowId: row.id
            });
          });
        }
      });

      // Expandable rows events
      const expandEvent = table.getAttribute('expand-event');
      if (expandEvent) {
        this.listen(table, 'cds-table-row-expando-toggled', e => {
          this.dispatchPanelEvent(expandEvent, {
            ...attrs,
            rowId: e.target.id,
            expanded: e.detail.expanded
          });
        });
      }

      // Sort events
      const sortEvent = table.getAttribute('sort-event');
      if (sortEvent) {
        this.listen(table, 'cds-table-header-cell-sort', e => {
          this.dispatchPanelEvent(sortEvent, {
            ...attrs,
            sortColumn: e.detail.columnId,
            sortDirection: e.detail.sortDirection
          });
        });
      }

      // High-level sorted event (fires after sorting is complete)
      const sortedEvent = table.getAttribute('sorted-event');
      if (sortedEvent) {
        this.listen(table, 'cds-table-sorted', e => {
          this.dispatchPanelEvent(sortedEvent, {
            ...attrs,
            sortColumn: e.detail.columnId,
            sortDirection: e.detail.sortDirection
          });
        });
      }

      // Batch actions events
      const batchActionsElement = table.querySelector('cds-table-batch-actions');
      if (batchActionsElement) {
        const batchCancelEvent = table.getAttribute('batch-cancel-event');
        if (batchCancelEvent) {
          this.listen(batchActionsElement, 'cds-table-batch-actions-cancel-clicked', e => {
            this.dispatchPanelEvent(batchCancelEvent, {
              ...attrs,
              action: 'cancel'
            });
          });
        }

        const batchSelectAllEvent = table.getAttribute('batch-select-all-event');
        if (batchSelectAllEvent) {
          this.listen(batchActionsElement, 'cds-table-batch-actions-select-all-clicked', e => {
            this.dispatchPanelEvent(batchSelectAllEvent, {
              ...attrs,
              action: 'select-all'
            });
          });
        }
      }

      // Table search/filter event
      const searchElement = table.querySelector('cds-search');
      if (searchElement) {
        const searchEvent = table.getAttribute('search-event');
        if (searchEvent) {
          this.listen(searchElement, 'cds-search-input', e => {
            this.dispatchPanelEvent(searchEvent, {
              ...attrs,
              searchTerm: e.target.value
            });
          });
        }

        // High-level filtered event
        const filteredEvent = table.getAttribute('filtered-event');
        if (filteredEvent) {
          this.listen(table, 'cds-table-filtered', e => {
            this.dispatchPanelEvent(filteredEvent, {
              ...attrs,
              searchTerm: e.detail.searchTerm
            });
          });
        }
      }
    }
  },

  // Overflow Menu
  'cds-overflow-menu': {
    import: overflowMenuImport,
    // We collect the menu attributes from the menu, but we listen for the
    // events on the menu body.
    init: function (overflowMenu) {
      const menuAttr = getSemanticAttributes(overflowMenu);
      const eventName = menuAttr.event;
      const menuBody = overflowMenu.querySelector('cds-overflow-menu-body');
      if (eventName && menuBody) {
        this.listen(menuBody, 'cds-overflow-menu-item-clicked', e => {
          e.stopPropagation();
          const menuAttr = getSemanticAttributes(e.target);
          this.dispatchPanelEvent(eventName, {
            ...menuAttr,
            ...menuAttr
          });
        });
      }
    }
  },

  // Structured List
  'cds-structured-list': {
    import: structuredListImport,
    init: function (list) {
      const listAttrs = getSemanticAttributes(list);

      // Row clicks
      const rows = [...list.querySelectorAll('cds-structured-list-row')];
      rows.forEach(row => {
        const rowAttrs = getSemanticAttributes(row);
        const eventName = rowAttrs.event || listAttrs.event;

        if (eventName) {
          this.listen(row, 'click', e => {
            e.stopPropagation();
            this.dispatchPanelEvent(eventName, {
              ...listAttrs,
              ...rowAttrs
            });
          });
        }
      });

      // Selection changes (if selection enabled)
      if (list.hasAttribute('selection')) {
        this.listen(list, 'cds-structured-list-selected', e => {
          const selectedRow = e.detail.row;
          const rowAttrs = getSemanticAttributes(selectedRow);
          const selectionEvent = listAttrs.event;

          if (selectionEvent) {
            this.dispatchPanelEvent(selectionEvent, {
              ...listAttrs,
              ...rowAttrs
            });
          }
        });
      }
    }
  },

  // Progress Bar - monitors for completion
  'cds-progress-bar': {
    import: progressBarImport,
    init: function (progressBar) {
      const attrs = getSemanticAttributes(progressBar);

      if (attrs.event) {
        const observer = new MutationObserver(() => {
          const value = parseFloat(progressBar.getAttribute('value') || '0');
          const max = parseFloat(progressBar.getAttribute('max') || '100');

          if (value >= max) {
            this.dispatchPanelEvent(attrs.event, {
              ...attrs,
              value: value,
              status: 'complete'
            });
          }
        });

        observer.observe(progressBar, {
          attributes: true,
          attributeFilter: ['value']
        });

        progressBar._progressObserver = observer;
      }
    }
  },

  // Modal - multiple event types
  'cds-modal': {
    import: modalImport,
    init: function (modal) {
      console.log('[Carbon Modal] Initializing modal', modal);
      const attrs = getSemanticAttributes(modal);
      console.log('[Carbon Modal] Semantic attributes:', attrs);

      // Open event
      const openEvent = getEventAttribute(modal, 'open-event', 'event');
      if (openEvent) {
        this.listen(modal, 'cds-modal-beingopened', e => {
          this.dispatchPanelEvent(openEvent, {
            ...attrs,
            action: 'opened'
          });
        });
      }

      // Before close event (cancelable)
      const beforeCloseEvent = modal.getAttribute('before-close-event');
      if (beforeCloseEvent) {
        this.listen(modal, 'cds-modal-beingclosed', e => {
          this.dispatchPanelEvent(beforeCloseEvent, {
            ...attrs,
            action: 'closing',
            cancelable: true
          });
        });
      }

      // Close event - Carbon's way of handling modal dismissal
      // ALWAYS emit 'destroy_me' to integrate with zooy's panel destruction
      // This is not configurable - modals MUST destroy their panel when closed
      console.log('[Carbon Modal] Attaching cds-modal-closed listener to', modal);
      this.listen(modal, 'cds-modal-closed', e => {
        console.log('[Carbon Modal] cds-modal-closed event fired', {
          triggeredBy: e.detail?.triggeredBy,
          eventDetail: e.detail,
          modal: modal
        });

        this.dispatchPanelEvent('destroy_me', {
          ...attrs,
          action: 'closed',
          triggeredBy: e.detail?.triggeredBy
        });

        console.log('[Carbon Modal] destroy_me event dispatched', attrs);
      });
      console.log('[Carbon Modal] Listener attached successfully');

      // Primary button event
      const primaryEvent = getEventAttribute(modal, 'primary-event', 'event');
      if (primaryEvent) {
        this.listen(modal, 'cds-modal-primary-focus', e => {
          this.dispatchPanelEvent(primaryEvent, {
            ...attrs,
            action: 'primary'
          });
        });
      }
    }
  },

  // Modal sub-components (presentational)
  'cds-modal-header': {
    import: modalImport
    // No event handling - presentational header wrapper
  },

  'cds-modal-heading': {
    import: modalImport
    // No event handling - presentational heading element
  },

  'cds-modal-label': {
    import: modalImport
    // No event handling - presentational label element
  },

  'cds-modal-close-button': {
    import: modalImport
    // No event handling - close button handled by modal itself via data-modal-close
  },

  'cds-modal-body': {
    import: modalImport
    // No event handling - presentational body wrapper
  },

  'cds-modal-body-content': {
    import: modalImport
    // No event handling - presentational content wrapper
  },

  'cds-modal-footer': {
    import: modalImport
    // No event handling - presentational footer wrapper
  },

  'cds-modal-footer-button': {
    import: modalImport,
    init: function (button) {
      const attrs = getSemanticAttributes(button);
      const buttonType = button.getAttribute('type');

      // Submit buttons need special handling because Carbon button's native <button>
      // is inside shadow DOM, which breaks the form submission mechanism.
      // We manually trigger form submission on the associated form.
      if (buttonType === 'submit') {
        this.listen(button, 'click', e => {
          // Find the form - either as ancestor or via HTML5 form attribute
          let form = button.closest('form');

          // If button is outside form (e.g., in modal footer), check form attribute
          if (!form) {
            const formId = button.getAttribute('form');
            if (formId) {
              form = document.getElementById(formId);
            }
          }

          if (form) {
            // Use requestSubmit() which properly triggers validation and submit event
            // FormPanel's interceptFormSubmit() will catch this and handle it
            form.requestSubmit();
          }
        });
        return;
      }

      // Standard button event handling (for non-submit buttons)
      const eventName = attrs.event;
      if (eventName) {
        this.listen(button, 'click', e => {
          e.stopPropagation();
          this.dispatchPanelEvent(eventName, attrs);
        });
      }
    }
  },

  // Breadcrumb
  // 'cds-breadcrumb': {
  //   init: function(breadcrumb) {
  //     const breadcrumbAttrs = getSemanticAttributes(breadcrumb);
  //     const eventName = breadcrumbAttrs.event;
  //
  //     if (eventName) {
  //       // Helper to dispatch breadcrumb event
  //       const dispatchBreadcrumbEvent = (itemAttrs) => {
  //         this.dispatchPanelEvent(eventName, {
  //           ...breadcrumbAttrs,
  //           ...itemAttrs
  //         });
  //       };
  //
  //       // Listen for breadcrumb link clicks (event delegation)
  //       this.listen(breadcrumb, 'click', e => {
  //         const link = e.target.closest('cds-breadcrumb-link');
  //         if (link) {
  //           e.stopPropagation();
  //           const linkAttrs = getSemanticAttributes(link);
  //           dispatchBreadcrumbEvent(linkAttrs);
  //         }
  //       });
  //
  //       // // Listen for overflow menu selections and convert to breadcrumb events
  //       // const overflowMenus = [...breadcrumb.querySelectorAll('cds-overflow-menu[breadcrumb]')];
  //       // overflowMenus.forEach(overflowMenu => {
  //       //   this.listen(overflowMenu, 'cds-overflow-menu-selected', e => {
  //       //     e.stopPropagation();
  //       //     const selectedItem = e.detail.item;
  //       //     const itemAttrs = getSemanticAttributes(selectedItem);
  //       //     dispatchBreadcrumbEvent(itemAttrs);
  //       //   });
  //       // });
  //     }
  //   }
  // },

  // // Breadcrumb Link (for individual link events if specified directly on links)
  // 'cds-breadcrumb-link': {
  //   event: 'click',
  //   getData: (e, attrs, element) => ({
  //     ...attrs,
  //     href: element.getAttribute('href')
  //   })
  // },

  // Pagination
  'cds-pagination': {
    import: paginationImport,
    init: function (pagination) {
      const attrs = getSemanticAttributes(pagination);

      // Page navigation event (next/prev/page select)
      const pageChangeEvent = attrs.event;
      if (pageChangeEvent) {
        this.listen(pagination, 'cds-pagination-changed-current', e => {
          this.dispatchPanelEvent(pageChangeEvent, {
            ...attrs,
            page: e.detail.page,
            pageSize: e.detail.pageSize,
            action: 'page-change'
          });
        });
      }

      // Page size change event (items per page dropdown)
      const pageSizeEvent = pagination.getAttribute('page-size-event');
      if (pageSizeEvent) {
        this.listen(pagination, 'cds-page-sizes-select-changed', e => {
          this.dispatchPanelEvent(pageSizeEvent, {
            ...attrs,
            page: e.detail.page,
            pageSize: e.detail.pageSize,
            action: 'page-size-change'
          });
        });
      }
    }
  },

  // Accordion
  'cds-accordion': {
    import: accordionImport,
    init: function (accordion) {
      const attrs = getSemanticAttributes(accordion);

      // Listen for accordion item toggles
      const items = [...accordion.querySelectorAll('cds-accordion-item')];
      items.forEach(item => {
        const itemAttrs = getSemanticAttributes(item);
        const eventName = itemAttrs.event || attrs.event;

        if (eventName) {
          this.listen(item, 'cds-accordion-item-toggled', e => {
            this.dispatchPanelEvent(eventName, {
              ...attrs,
              ...itemAttrs,
              open: e.detail.open
            });
          });
        }
      });
    }
  },

  // Content Switcher
  'cds-content-switcher': {
    import: contentSwitcherImport,
    init: function (switcher) {
      const attrs = getSemanticAttributes(switcher);

      // Before selection event (cancelable)
      const beforeSelectEvent = switcher.getAttribute('before-select-event');
      if (beforeSelectEvent) {
        this.listen(switcher, 'cds-content-switcher-beingselected', e => {
          this.dispatchPanelEvent(beforeSelectEvent, {
            ...attrs,
            value: e.detail.value,
            cancelable: true
          });
        });
      }

      // After selection event
      const selectEvent = attrs.event;
      if (selectEvent) {
        this.listen(switcher, 'cds-content-switcher-selected', e => {
          const selectedItem = e.detail.item;
          const itemAttrs = getSemanticAttributes(selectedItem);
          this.dispatchPanelEvent(selectEvent, {
            ...attrs,
            ...itemAttrs,
            value: selectedItem.getAttribute('value')
          });
        });
      }
    }
  },

  // Link
  'cds-link': {
    import: linkImport,
    event: 'click',
    getData: (e, attrs, element) => ({
      ...attrs,
      href: element.getAttribute('href')
    })
  },

  // Tree View
  'cds-tree-view': {
    import: treeViewImport,
    init: function (tree) {
      const attrs = getSemanticAttributes(tree);

      // Listen for node selection
      this.listen(tree, 'cds-tree-node-selected', e => {
        const node = e.detail.node;
        const nodeAttrs = getSemanticAttributes(node);
        const eventName = nodeAttrs.event || attrs.event;

        if (eventName) {
          this.dispatchPanelEvent(eventName, {
            ...attrs,
            ...nodeAttrs,
            nodeId: node.id,
            label: node.getAttribute('label')
          });
        }
      });

      // Listen for node expansion
      const expandEvent = getEventAttribute(tree, 'expand-event');
      if (expandEvent) {
        this.listen(tree, 'cds-tree-node-expanded', e => {
          this.dispatchPanelEvent(expandEvent, {
            ...attrs,
            nodeId: e.detail.node.id,
            expanded: e.detail.expanded
          });
        });
      }
    }
  },

  // Tooltip
  'cds-tooltip': {
    import: tooltipImport,
    init: function (tooltip) {
      const attrs = getSemanticAttributes(tooltip);

      // Listen for tooltip open/close
      const openEvent = getEventAttribute(tooltip, 'open-event');
      if (openEvent) {
        this.listen(tooltip, 'cds-tooltip-beingopened', e => {
          this.dispatchPanelEvent(openEvent, {
            ...attrs,
            action: 'opened'
          });
        });
      }

      const closeEvent = getEventAttribute(tooltip, 'close-event');
      if (closeEvent) {
        this.listen(tooltip, 'cds-tooltip-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }
    }
  },

  // Popover
  'cds-popover': {
    import: popoverImport,
    init: function (popover) {
      const attrs = getSemanticAttributes(popover);

      // Listen for popover open/close
      const openEvent = getEventAttribute(popover, 'open-event');
      if (openEvent) {
        this.listen(popover, 'cds-popover-beingopened', e => {
          this.dispatchPanelEvent(openEvent, {
            ...attrs,
            action: 'opened'
          });
        });
      }

      const closeEvent = getEventAttribute(popover, 'close-event');
      if (closeEvent) {
        this.listen(popover, 'cds-popover-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }
    }
  },

  // Notification
  'cds-toast-notification': {
    import: notificationImport,
    event: 'cds-notification-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'closed'
    })
  },

  'cds-inline-notification': {
    import: notificationImport,
    event: 'cds-notification-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'closed'
    })
  },

  'cds-actionable-notification': {
    import: notificationImport,
    init: function (notification) {
      const attrs = getSemanticAttributes(notification);

      // Close event
      const closeEvent = getEventAttribute(notification, 'close-event', 'event');
      if (closeEvent) {
        this.listen(notification, 'cds-notification-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }

      // Action button event
      const actionEvent = getEventAttribute(notification, 'action-event');
      if (actionEvent) {
        this.listen(notification, 'cds-notification-actioned', e => {
          this.dispatchPanelEvent(actionEvent, {
            ...attrs,
            action: 'actioned'
          });
        });
      }
    }
  },

  // Code Snippet
  'cds-code-snippet': {
    import: codeSnippetImport,
    event: 'cds-copy-button-clicked',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'copied'
    })
  },

  // Tiles
  'cds-clickable-tile': {
    import: tileImport,
    event: 'click',
    getData: (e, attrs) => ({
      ...attrs,
      href: e.currentTarget.getAttribute('href')
    })
  },

  'cds-expandable-tile': {
    import: tileImport,
    init: function (tile) {
      const attrs = getSemanticAttributes(tile);

      // Before toggle event (cancelable)
      const beforeToggleEvent = tile.getAttribute('before-toggle-event');
      if (beforeToggleEvent) {
        this.listen(tile, 'cds-expandable-tile-beingtoggled', e => {
          this.dispatchPanelEvent(beforeToggleEvent, {
            ...attrs,
            expanded: e.detail.expanded,
            cancelable: true
          });
        });
      }

      // After toggle event
      const toggleEvent = attrs.event;
      if (toggleEvent) {
        this.listen(tile, 'cds-expandable-tile-toggled', e => {
          this.dispatchPanelEvent(toggleEvent, {
            ...attrs,
            expanded: e.detail.expanded
          });
        });
      }
    }
  },

  'cds-selectable-tile': {
    import: tileImport,
    event: 'cds-selectable-tile-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      selected: e.detail.selected,
      value: element.value
    })
  },

  'cds-radio-tile': {
    import: tileImport,
    event: 'cds-selectable-tile-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      selected: e.detail.selected,
      value: element.value
    })
  },

  // Progress Indicator
  'cds-progress-indicator': {
    import: progressIndicatorImport,
    init: function (indicator) {
      const attrs = getSemanticAttributes(indicator);

      // Listen for step clicks
      this.listen(indicator, 'cds-progress-step-click', e => {
        // Get attributes from the clicked step
        const step = e.target;
        const stepAttrs = getSemanticAttributes(step);
        const eventName = stepAttrs.event || attrs.event;

        if (eventName) {
          this.dispatchPanelEvent(eventName, {
            ...attrs,
            ...stepAttrs,
            stepIndex: step.getAttribute('data-index'),
            stepLabel: step.getAttribute('label')
          });
        }
      });
    }
  },

  // Combo Button - composed of button + menu
  'cds-combo-button': {
    import: comboButtonImport,
    init: function (comboButton) {
      const attrs = getSemanticAttributes(comboButton);

      // Listen for clicks on the primary button
      const primaryButton = comboButton.querySelector('cds-button');
      if (primaryButton && attrs.event) {
        this.listen(primaryButton, 'click', e => {
          this.dispatchPanelEvent(attrs.event, {
            ...attrs,
            action: 'primary'
          });
        });
      }

      // Listen for menu item selections
      const menu = comboButton.querySelector('cds-menu');
      if (menu) {
        this.listen(menu, 'click', e => {
          if (e.target.tagName === 'CDS-MENU-ITEM') {
            const menuItemAttrs = getSemanticAttributes(e.target);
            const menuEventName = menuItemAttrs.event || getEventAttribute(comboButton, 'menu-event', 'event');

            if (menuEventName) {
              this.dispatchPanelEvent(menuEventName, {
                ...attrs,
                ...menuItemAttrs,
                action: 'menu-item'
              });
            }
          }
        });
      }
    }
  },

  // Toggletip - tooltip that stays open until dismissed
  'cds-toggletip': {
    import: toggleTipImport,
    init: function (toggletip) {
      const attrs = getSemanticAttributes(toggletip);

      // Monitor open/close state changes
      if (attrs.event) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.attributeName === 'open') {
              const isOpen = toggletip.hasAttribute('open');
              this.dispatchPanelEvent(attrs.event, {
                ...attrs,
                action: isOpen ? 'opened' : 'closed',
                open: isOpen
              });
            }
          });
        });

        observer.observe(toggletip, {
          attributes: true,
          attributeFilter: ['open']
        });

        toggletip._toggletipObserver = observer;
      }
    }
  },

  // Menu
  'cds-menu': {
    import: menuImport,
    init: function (menu) {
      const attrs = getSemanticAttributes(menu);

      // Menu open event
      const openEvent = getEventAttribute(menu, 'open-event');
      if (openEvent) {
        this.listen(menu, 'cds-menu-opened', e => {
          this.dispatchPanelEvent(openEvent, {
            ...attrs,
            action: 'opened'
          });
        });
      }

      // Menu close event
      const closeEvent = getEventAttribute(menu, 'close-event');
      if (closeEvent) {
        this.listen(menu, 'cds-menu-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }

      // Menu item clicks
      this.listen(menu, 'click', e => {
        if (e.target.tagName === 'CDS-MENU-ITEM') {
          const menuItemAttrs = getSemanticAttributes(e.target);
          const eventName = menuItemAttrs.event || attrs.event;

          if (eventName) {
            e.stopPropagation();
            this.dispatchPanelEvent(eventName, {
              ...attrs,
              ...menuItemAttrs
            });
          }
        }
      });

      // Selectable menu item changes
      this.listen(menu, 'cds-item-changed', e => {
        const item = e.detail.triggeredBy;
        const itemAttrs = getSemanticAttributes(item);
        const eventName = itemAttrs.event || attrs.event;

        if (eventName) {
          this.dispatchPanelEvent(eventName, {
            ...attrs,
            ...itemAttrs,
            action: 'selection-changed'
          });
        }
      });
    }
  },

  // Menu Button - button that opens a menu
  'cds-menu-button': {
    import: menuImport,
    init: function (menuButton) {
      const attrs = getSemanticAttributes(menuButton);

      // Listen for menu item selections
      const menu = menuButton.querySelector('cds-menu');
      if (menu) {
        this.listen(menu, 'click', e => {
          if (e.target.tagName === 'CDS-MENU-ITEM') {
            const menuItemAttrs = getSemanticAttributes(e.target);
            const eventName = menuItemAttrs.event || attrs.event;

            if (eventName) {
              e.stopPropagation();
              this.dispatchPanelEvent(eventName, {
                ...attrs,
                ...menuItemAttrs
              });
            }
          }
        });
      }
    }
  }
};

/**
 * Generic Carbon component renderer with lazy loading.
 * Orchestrates the scanning, loading, and initialization of Carbon components.
 *
 * Flow:
 * 1. Scan panel DOM once for all Carbon components
 * 2. Collect unique import functions needed
 * 3. Load all imports in parallel (with caching)
 * 4. Attach event listeners to components
 *
 * @param {Element} panel - The panel element to search for components
 * @param {Map<Function, Promise>} cache - Import cache from Conductor
 * @this {Panel} - The panel instance (bound via .call())
 * @returns {Promise<void>}
 */
export const renderCarbonComponents = async function (panel, cache) {
  console.log('[Carbon] renderCarbonComponents called with panel:', panel);

  // Step 1: Single DOM scan - categorize all Carbon elements
  const elementMap = scanForCarbonComponents(panel);
  console.log('[Carbon] Scanned elements:', elementMap);

  if (elementMap.size === 0) {
    console.log('[Carbon] No Carbon components found in panel');
    this.debugMe('[Carbon] No Carbon components found in panel');
    return;
  }

  console.log('[Carbon] Found components:', Array.from(elementMap.keys()));

  // Step 2: Determine which imports are needed
  const importsNeeded = collectImportsNeeded(elementMap);

  // Step 3: Load all needed components in parallel (with caching)
  if (importsNeeded.size > 0) {
    this.debugMe(`[Carbon] Loading ${importsNeeded.size} component module(s)...`);

    try {
      await loadComponentImports(importsNeeded, cache);
      this.debugMe('[Carbon] All component modules loaded successfully');
    } catch (error) {
      console.error('[Carbon] Failed to load some component modules:', error);
      // Continue anyway - some components may have loaded successfully
    }
  }

  // Step 4: Attach event listeners using the scanned element map
  const totalInitialized = attachEventListeners(elementMap, this);

  if (totalInitialized > 0) {
    this.debugMe(`[Carbon] Total components initialized: ${totalInitialized}`);
  }
};
