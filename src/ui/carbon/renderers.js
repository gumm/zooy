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

import {getSemanticAttributes, getEventAttribute} from '../zoo/attributes.js';

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

  // Icon Toggle - manual state management with visual feedback
  'cds-icon-button[data-toggle="true"]': {
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
    event: 'cds-number-input',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: e.detail.value,
      direction: e.detail.direction  // 'up' or 'down' when using steppers
    })
  },

  // Password Input
  'cds-password-input': {
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
    event: 'cds-search-input',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: element.value
    })
  },

  // Combo Box
  'cds-combo-box': {
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
    event: 'cds-time-picker-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      value: element.value
    })
  },

  // File Uploader
  'cds-file-uploader': {
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
    event: 'click',
    getData: (e, attrs) => attrs
  },

  // Dismissible tags (closeable tags with X button)
  'cds-dismissible-tag': {
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
    event: 'cds-filter-tag-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'remove'
    })
  },

  // Tabs
  'cds-tabs': {
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
    init: function (modal) {
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
    event: 'click',
    getData: (e, attrs, element) => ({
      ...attrs,
      href: element.getAttribute('href')
    })
  },

  // Tree View
  'cds-tree-view': {
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
    event: 'cds-notification-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'closed'
    })
  },

  'cds-inline-notification': {
    event: 'cds-notification-closed',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'closed'
    })
  },

  'cds-actionable-notification': {
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
    event: 'cds-copy-button-clicked',
    getData: (e, attrs) => ({
      ...attrs,
      action: 'copied'
    })
  },

  // Tiles
  'cds-clickable-tile': {
    event: 'click',
    getData: (e, attrs) => ({
      ...attrs,
      href: e.currentTarget.getAttribute('href')
    })
  },

  'cds-expandable-tile': {
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
    event: 'cds-selectable-tile-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      selected: e.detail.selected,
      value: element.value
    })
  },

  'cds-radio-tile': {
    event: 'cds-selectable-tile-changed',
    getData: (e, attrs, element) => ({
      ...attrs,
      selected: e.detail.selected,
      value: element.value
    })
  },

  // Progress Indicator
  'cds-progress-indicator': {
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
 * Generic Carbon component renderer
 * Iterates through configuration and attaches event listeners to all components
 *
 * @param {Element} panel - The panel element to search for components
 * @this {Panel} - The panel instance (bound via .call())
 */
export const renderCarbonComponents = function (panel) {
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
