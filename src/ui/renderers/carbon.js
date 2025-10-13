/**
 * Generic Carbon Design System Component Renderer
 *
 * Configuration-driven approach to attach event listeners to Carbon components.
 * This single renderer replaces 18 individual component renderers with a
 * declarative configuration.
 *
 * Benefits:
 * - Single source of truth for all Carbon component integrations
 * - Easy to add new components - just add configuration
 * - Consistent event handling patterns
 * - Reduced code duplication
 * - Future-proof - doesn't depend on Carbon internals
 *
 * @see https://web-components.carbondesignsystem.com/
 */

import { getSemanticAttributes, getEventAttribute } from '../zoo/attributes.js';

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
  // Buttons
  'cds-button': {
    event: 'click',
    getData: (e, attrs) => attrs
  },

  'cds-icon-button': {
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // FAB (Floating Action Button) - just a styled button
  'cds-button[data-fab="true"]': {
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // Icon Toggle - manual state management
  'cds-icon-button[data-toggle="true"]': {
    event: 'click',
    getData: (e, attrs, element) => {
      // Toggle is-selected attribute
      const isSelected = element.hasAttribute('is-selected');
      if (isSelected) {
        element.removeAttribute('is-selected');
      } else {
        element.setAttribute('is-selected', '');
      }
      return { ...attrs, isOn: !isSelected };
    }
  },

  // Text Input
  'cds-text-input': {
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

  // Dropdown
  'cds-dropdown': {
    event: 'cds-dropdown-selected',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: element.value,
      selectedValue: e.detail?.item?.value,
      selectedText: e.detail?.item?.textContent?.trim()
    })
  },

  // Checkbox - Carbon uses custom event
  'cds-checkbox': {
    event: 'cds-checkbox-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      checked: e.detail.checked,
      value: element.value
    })
  },

  // Radio Button Group - only listen to the group, not individual buttons
  'cds-radio-button-group': {
    event: 'cds-radio-button-group-changed',
    getData: (e, attrs) => ({
      ...attrs,
      value: e.detail?.value
    })
  },

  // Toggle
  'cds-toggle': {
    event: 'cds-toggle-changed',
    getData: (e, attrs) => ({
      ...attrs,
      isOn: e.detail.checked,
      value: e.detail.checked
    })
  },

  // Select
  'cds-select': {
    event: 'cds-select-selected',
    getData: (e, attrs) => ({
      ...attrs,
      value: e.detail.value
    })
  },

  // Slider
  'cds-slider': {
    event: 'cds-slider-changed',
    getData: (e, attrs) => ({
      ...attrs,
      value: e.detail.value
    })
  },

  // Tags - regular tags (click)
  'cds-tag': {
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // Filter tags (close/remove)
  'cds-filter-tag': {
    event: 'cds-filter-tag-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'remove'
    })
  },

  // Tabs
  'cds-tabs': {
    event: 'cds-tabs-selected',
    getData: (e, attrs) => {
      const selectedTab = e.detail.item;
      const tabAttrs = getSemanticAttributes(selectedTab);
      return {
        ...attrs,
        ...tabAttrs,
        tabValue: e.detail.value
      };
    }
  },

  // Data Table - uses custom init for multiple event types
  'cds-table': {
    init: function(table) {
      const attrs = getSemanticAttributes(table);

      // Row selection events
      const selectionEvent = table.getAttribute('selection-event') || attrs.event;
      if (selectionEvent) {
        this.listen(table, 'cds-table-row-selection-changed', e => {
          this.dispatchPanelEvent(selectionEvent, {
            ...attrs,
            selectedCount: e.detail.selectedRows?.length || 0
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
              ...rowAttrs
            });
          });
        }
      });

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
    }
  },

  // Overflow Menu
  'cds-overflow-menu': {
    event: 'cds-overflow-menu-selected',
    getData: (e, attrs) => {
      const selectedItem = e.detail.item;
      const itemAttrs = getSemanticAttributes(selectedItem);
      const eventName = itemAttrs.event || attrs.event;
      return {
        ...attrs,
        ...itemAttrs,
        // Store the actual event name in case item has its own
        _eventOverride: eventName !== attrs.event ? eventName : null
      };
    }
  },

  // Structured List
  'cds-structured-list': {
    init: function(list) {
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
    init: function(progressBar) {
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
    init: function(modal) {
      const attrs = getSemanticAttributes(modal);

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

      // Close event
      const closeEvent = getEventAttribute(modal, 'close-event', 'event');
      if (closeEvent) {
        this.listen(modal, 'cds-modal-closed', e => {
          this.dispatchPanelEvent(closeEvent, {
            ...attrs,
            action: 'closed'
          });
        });
      }

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
  }
};

/**
 * Generic Carbon component renderer
 * Iterates through configuration and attaches event listeners to all components
 *
 * @param {Element} panel - The panel element to search for components
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderCarbonComponents = function(panel) {
  let totalInitialized = 0;

  Object.entries(COMPONENT_CONFIG).forEach(([selector, config]) => {
    const elements = [...panel.querySelectorAll(selector)];

    if (elements.length === 0) {
      return;
    }

    elements.forEach(element => {
      // Custom initialization (for complex components)
      if (config.init) {
        config.init.call(this, element);
        return;
      }

      // Multi-event components (e.g., text-input with input + change)
      if (config.multiEvent) {
        const attrs = getSemanticAttributes(element);
        config.events.forEach(eventConfig => {
          const eventName = getEventAttribute(element, eventConfig.attrName, 'event');
          if (eventName) {
            this.listen(element, eventConfig.type, e => {
              this.dispatchPanelEvent(eventName, eventConfig.getData(e, attrs, element));
            });
          }
        });
        return;
      }

      // Standard single-event components
      const attrs = getSemanticAttributes(element);
      const eventName = attrs.event;

      if (eventName) {
        this.listen(element, config.event, e => {
          e.stopPropagation();
          const data = config.getData(e, attrs, element);

          // Handle event override (e.g., menu items with their own event names)
          const finalEventName = data._eventOverride || eventName;
          delete data._eventOverride;

          this.dispatchPanelEvent(finalEventName, data);
        });
      }
    });

    totalInitialized += elements.length;
    this.debugMe(`Initialized ${elements.length} ${selector} component(s)`);
  });

  if (totalInitialized > 0) {
    this.debugMe(`Total Carbon components initialized: ${totalInitialized}`);
  }
};
