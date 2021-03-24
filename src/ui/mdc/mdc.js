import {getElDataMap} from "../../dom/utils.js";
import {select, tabBar} from "material-components-web/index";
import {toLowerCase} from "badu/badu";


/**
 * {@link https://material.io/develop/web/components/ripples/}
 * @param {Panel} panel
 */
export const renderRipples = function(panel) {
  [...panel.querySelectorAll('.mdc-ripple-surface')].forEach(
      mdc.ripple.MDCRipple.attachTo);
};


/**
 * {@link https://material.io/develop/web/components/buttons/}
 * @param {Panel} panel
 */
export const renderButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-button')].forEach(el => {
    mdc.ripple.MDCRipple.attachTo(el);
    this.listen(el, 'click', e => {
      // e.stopPropagation();
      const trg = e.currentTarget;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
      }, elDataMap));
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/buttons/floating-action-buttons/}
 * @param {Panel} panel
 */
export const renderFloatingActionButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-fab')].forEach(el => {
    mdc.ripple.MDCRipple.attachTo(el);
    this.listen(el, 'click', e => {
      e.stopPropagation();
      const trg = e.currentTarget;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/buttons/icon-buttons/}
 * @param {Panel} panel
 */
export const renderIconButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-button:not(.mdc-icon-toggle)')].forEach(el => {
    const b = new mdc.ripple.MDCRipple(el);
    b.unbounded = true;

    this.listen(el, 'click', e => {
      const trg = e.currentTarget;
      const elDataMap = getElDataMap(trg);
      const propageEvent = elDataMap['evpropagate'] || ''

      if (propageEvent.toLowerCase() === "allow") {
        // Allow propagation
      } else {
        e.stopPropagation();
      }
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/buttons/icon-buttons/}
 * @param {Panel} panel
 */
export const renderIconToggleButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-icon-toggle')].forEach(el => {
    const _ = new mdc.iconButton.MDCIconButtonToggle(el);
    this.listen(el, 'click', e => e.stopPropagation());
    this.listen(el, 'MDCIconButtonToggle:change', e => {
      e.stopPropagation();
      const trg = e.currentTarget;
      const isOn = e.detail.isOn;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: isOn
      }, elDataMap));
    });
  });
};

export const renderDataTables = function(panel) {
  const checkboxController = "mdc-checkbox__native-control";
  [...panel.querySelectorAll('.mdc-data-table')].forEach(el => {
    const dataTable = new mdc.dataTable.MDCDataTable(el);

    // A flag to indicate that the user wants to select
    // all across all pages.
    dataTable.selectedAllAcrossPages = false;

    dataTable.onSomeSelected = () => {
    };
    dataTable.onNoneSelected = () => {
    };
    dataTable.onAllSelected = () => {
    };
    dataTable.toggleSelectAcrossPages = () => {
      dataTable.selectedAllAcrossPages = !dataTable.selectedAllAcrossPages;
      return dataTable.selectedAllAcrossPages;
    }
    dataTable.setSelectAcrossPages = bool => {
      dataTable.selectedAllAcrossPages = bool;
      return dataTable.selectedAllAcrossPages;
    }
    dataTable.getSelectAcrossPages = () => {
      return dataTable.selectedAllAcrossPages;
    }

    el.dataTable = dataTable;

    const onSelections = e => {
      const selectedRowCount = dataTable.getSelectedRowIds().length
      if (e.type === 'MDCDataTable:selectedAll') {
        dataTable.onAllSelected();
      } else if (selectedRowCount === 0) {
        dataTable.onNoneSelected();
      } else {
        dataTable.onSomeSelected();
      }
    }

    ['MDCDataTable:rowSelectionChanged',
      'MDCDataTable:selectedAll',
      'MDCDataTable:unselectedAll'
    ].forEach(eventString => {
      this.listen(el, eventString, onSelections);
    });

    [...el.querySelectorAll('.mdc-data-table__row')].forEach(r => {
      this.listen(r, 'click', e => {
        const triggeredElement = e.target;
        if (!triggeredElement.classList.contains(checkboxController)) {
          e.stopPropagation();
          const trg = e.currentTarget;
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href']
          }, elDataMap));
        }
      });
    });
  });
}

/**
 * {@link https://material.io/develop/web/components/tabs/tab-bar/}
 * @param {Panel} panel
 */
export const renderTabBars = function(panel) {
  [...panel.querySelectorAll('.mdc-tab-bar')].forEach(el => {
    const tbar = new mdc.tabBar.MDCTabBar(el);
    this.listen(el, 'MDCTabBar:activated', e => {
      const trg = tbar.tabList_[e.detail.index].root;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href']
      }, elDataMap));
    })
  });
};


/**
 * {@link https://material.io/develop/web/components/input-controls/switches/}
 * @param {Panel} panel
 */
export const renderSwitches = function(panel) {
  [...panel.querySelectorAll('.mdc-switch')].forEach(el => {
    const trg = el.querySelector('input');
    const elDataMap = getElDataMap(trg);
    this.listen(trg, 'change', e => {
      e.stopPropagation();
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: trg.checked,
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/chips/}
 * @param {Panel} panel
 */
export const renderChips = function(panel) {
  [...panel.querySelectorAll('.mdc-chip-set')].forEach(el => {
    const chipSet = mdc.chips.MDCChipSet.attachTo(el);
    chipSet.listen('MDCChip:interaction', e => {
      const chip = chipSet.chips.find(c => c.id === e.detail.chipId);
      const trg = chip.root;
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href'],
        isOn: chip.selected,
      }, elDataMap));
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/menu-surface/}
 * @param {Panel} panel
 */
export const renderMenuSurfaces = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface')].forEach(
      mdc.menuSurface.MDCMenuSurface.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/menus/}
 * @param {Panel} panel
 */
export const renderMenus = function(panel) {
  [...panel.querySelectorAll('.mdc-menu-surface--anchor:not(.mdc-select__menu)')].forEach(
      menuButtonEl => {
        const menuEl = menuButtonEl.querySelector('.mdc-menu');
        const corner = getElDataMap(menuEl)['corner'] || 'BOTTOM_START';

        // Make the menu
        const menu = new mdc.menu.MDCMenu(menuEl);
        menu.setAnchorCorner(mdc.menuSurface.Corner[corner]);
        menu.items.forEach(mdc.ripple.MDCRipple.attachTo);
        menu.quickOpen = false;
        menu.listen('click', e => e.stopPropagation());
        menu.listen('MDCMenu:selected', e => {
          e.stopPropagation();
          const trg = e.detail['item'];
          const elDataMap = getElDataMap(trg);
          this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
            orgEvt: e,
            trigger: trg,
            href: trg.href || elDataMap['href'],
          }, elDataMap));
        });

        // Toggle the menu open or closed from the anchor element.
        menuButtonEl.addEventListener('click', e => {
          return menu.open = !menu.open
        });

        if (menuEl.classList.contains('z2-filter-on-keydown')) {
          const reset = () => {
            filterWord = '';
            menu.items.forEach(e => e.classList.remove('hidden_list_item'));
          }
          const nameTargets = [...menu.items].map(e => toLowerCase(
              e.querySelector('.mdc-list-item__text').textContent));
          let filterWord = '';
          const wordCodes = 'abcdefghijklmnopqrstuvwxyz0123456789 -_';
          const filterMenuOnTyping = e => {
            const key = toLowerCase(e.key);
            if (e.defaultPrevented) {
              return; // Do nothing if the event was already processed
            }
            if (wordCodes.includes(key)) {
              filterWord = `${filterWord}${key}`;
            } else if (key === "escape") {
              reset();
            } else if (key === "backspace") {
              filterWord = filterWord.slice(0, -1);
            }
            if (filterWord !== "") {
              nameTargets.forEach((target, i) => {
                if (target.includes(filterWord)) {
                  menu.items[i].classList.remove('hidden_list_item');
                } else {
                  menu.items[i].classList.add('hidden_list_item');
                }
              });
            }
          }
          menu.listen('MDCMenuSurface:closed', e => {
            reset();
            document.removeEventListener(
                'keydown', filterMenuOnTyping, true);
          })
          menu.listen('MDCMenuSurface:opened', e => {
            reset();
            document.addEventListener(
                'keydown', filterMenuOnTyping, true);
          })
        }

      });
};


/**
 * {@link https://material.io/develop/web/components/lists/}
 * @param {Panel} panel
 */
export const renderLists = function(panel) {
  [...panel.querySelectorAll('.mdc-list:not(.mdc-menu__items)')].forEach(el => {
    const list = new mdc.list.MDCList(el);
    list.listElements.forEach(mdc.ripple.MDCRipple.attachTo);
    this.listen(el, 'click', e => {
      const trg = e.target.closest('li');
      const elDataMap = getElDataMap(trg);
      this.dispatchPanelEvent(elDataMap['zv'], Object.assign({
        orgEvt: e,
        trigger: trg,
        href: trg.href || elDataMap['href']
      }, elDataMap));
    });
  });
};

/**
 * {@link https://material.io/develop/web/components/input-controls/sliders/}
 * @param {Panel} panel
 */
export const renderSliders = function(panel) {
  [...panel.querySelectorAll('.mdc-slider')].forEach(el => {
    const slider = new mdc.slider.MDCSlider(el);
    const elDataMap = getElDataMap(el);
    const inputEl = el.parentElement.querySelector(`#${elDataMap.inputid}`);
    this.listen(el, 'MDCSlider:change', (e) => {
      inputEl.value = slider.value;
    });
  });
};


/**
 * {@link https://material.io/develop/web/components/linear-progress/}
 * @param {Panel} panel
 */
export const renderLinearProgress = function(panel) {
  [...panel.querySelectorAll('.mdc-linear-progress')].forEach(el => {
    el.linProg = mdc.linearProgress.MDCLinearProgress.attachTo(el)
  });
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/}
 * @param {Panel} panel
 */
export const renderTextFields = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field')].forEach(
      mdc.textField.MDCTextField.attachTo
  );
};


/**
 * {@link https://material.io/develop/web/components/input-controls/text-field/icon/}
 * @param {Panel} panel
 */
export const renderTextFieldIcons = function(panel) {
  [...panel.querySelectorAll('.mdc-text-field-icon')].forEach(
      mdc.textField.MDCTextFieldIcon.attachTo
  );
};


/**
 * This whole thing is perfectly horrible!
 * {@link https://material.io/develop/web/components/input-controls/select-menus/}
 * @param {HTMLElement} panel
 */
export const renderSelectMenus = function(panel) {
  // Build the select menu items from the actual select options.
  // This just builds the DOM.
  const menuBuilder = (menuUl, htmSelectField, mdcSelect) => () => {

    while (menuUl.firstChild) {
      menuUl.removeChild(menuUl.lastChild);
    }
    [...htmSelectField.options].forEach(e => {
      const li = document.createElement('li');
      li.classList.add('mdc-list-item');
      li.dataset.value = e.value;
      if (e.selected) {
        li.classList.add('mdc-list-item--selected');
      }
      const span = document.createElement('span');
      span.classList.add('mdc-list-item__text');
      span.classList.add('z2-list-item-text');
      span.textContent = e.textContent;
      li.appendChild(span);
      menuUl.appendChild(li)
    })

    mdcSelect.layoutOptions();

    // Match the selected indexes, and listen for changes on the MDC component
    // so we can update the real form component.
    try {
      mdcSelect.selectedIndex = htmSelectField.options.selectedIndex;
    } catch (e) {
      console.log("Error:",
          htmSelectField.options.selectedIndex,
          htmSelectField, mdcSelect,
          mdcSelect.selectedIndex, e);
    }
  };

  // Calculate the fixed position and maxHeight of the menu surface.
  const calculatePosition = (anchorEl, toolbarEl) => e => {
    const el = e.target;
    const rect = anchorEl.getBoundingClientRect();
    const rect2 = toolbarEl.getBoundingClientRect();
    const vh = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0);
    const max = vh - rect.bottom - 20;  // Give some space at
                                        // the bottom of the page
    const top = rect.bottom - rect2.top;
    const left = rect.left - rect2.left;
    el.style.cssText = `max-height:${max}px;position:fixed;top:${top}px;left:${left}px;`;
  }

  [...panel.querySelectorAll('.mdc-select')].forEach(e => {

    const menuUl = e.querySelector('ul.mdc-list');
    const menuSurfaceEl = e.querySelector('.mdc-select__menu');
    const htmSelectField = e.querySelector('select');

    // We need to control the position of the menu surface.
    const anchorEl = e.querySelector('.mdc-select__anchor');
    const toolbarEl = panel.querySelector('.tst__toolbar');
    const calcPos = calculatePosition(anchorEl, toolbarEl);

    // Instantiate the MDCSelect component.
    // This adds the elements to the DOM
    const mdcSelect = new mdc.select.MDCSelect(e);

    // We park some accessors on the select field itself
    // This is so that we can manipulate the dropdowns from the outside i.e
    // if you would like the dropdown to dynamically update depending
    // on some other event.
    htmSelectField.buildMenu = menuBuilder(menuUl, htmSelectField, mdcSelect);
    htmSelectField.buildMenu();

    // This fires twice for some reason :(
    mdcSelect.listen('MDCSelect:change', () => {
      htmSelectField.options[mdcSelect.selectedIndex].selected = true;
      htmSelectField.dispatchEvent(new Event('custom:select:change'));
    });

    // Get a handle on the menu component, as we want
    // to listen for when it opens.
    const menu = mdcSelect.menu;
    menu.setFixedPosition(true);

    // Wholly override all css on the menu surface each time it opens.
    menu.listen('MDCMenuSurface:opened', calcPos);
  });

};

/**
 * {@link https://material.io/develop/web/components/input-controls/form-fields/}
 * @param {Panel} panel
 */
export const renderFormFields = function(panel) {
  [...panel.querySelectorAll(
      '.mdc-form-field:not(.for-radio):not(.for-checkbox)')].forEach(
      mdc.formField.MDCFormField.attachTo
  );
};

/**
 * {@link https://material.io/develop/web/components/input-controls/radio-buttons/}
 * @param {Panel} panel
 */
export const renderRadioButtons = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-radio')].forEach(ff => {
    const formField = new mdc.formField.MDCFormField(ff);
    const radContainerEl = ff.querySelector('.mdc-radio');
    radContainerEl.querySelector(
        'input[type="radio"]').classList.add('mdc-radio__native-control');
    formField.input = new mdc.radio.MDCRadio(radContainerEl);
  });
};

/**
 * {@link https://material.io/develop/web/components/input-controls/checkboxes/}
 * @param {Panel} panel
 */
export const renderCheckBoxes = function(panel) {
  [...panel.querySelectorAll('.mdc-form-field.for-checkbox')].forEach(ff => {
    const cbEl = ff.querySelector('.mdc-checkbox');
    const checkBox = new mdc.checkbox.MDCCheckbox(cbEl);
    const formField = new mdc.formField.MDCFormField(ff);
    formField.input = checkBox;
  });
};



