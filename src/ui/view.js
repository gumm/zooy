import EVT from './evt.js';
import {UiEventType} from '../events/uieventtype.js'
import {enableClass, toggleClass} from '../dom/utils.js';
import ZooyEventData from "../events/zooyeventdata.js";
import UserManager from "../user/usermanager.js";
import Panel from './panel.js';


/**
 * Toggle the whole tree display either open or closed
 * @param {Panel} panel
 * @param {{isOn: boolean}} eventData
 */
const toggleTree = (eventData, panel) => {
  // The first level children. From a pure usability perspective
  // its nicer if we don't to close these. If we did, the tree *always* ends
  // up with only one element revealed. So we keep the first level children
  // open at all times.
  const fc = panel.getElement().querySelector('.children');
  const isOn = /**@type {boolean} */ (eventData.isOn);
  const children = panel.getElement().querySelectorAll('.children');
  const revealIcons = panel.getElement().querySelectorAll('.tst__reveal_icon');
  [...children].forEach(e => enableClass(
      e, 'tst__tree-children__hidden', e !== fc && !isOn));
  [...revealIcons].forEach(e => enableClass(
      e, 'tst__icon_rotated', e !== fc && !isOn));
};


/**
 * @param {Panel} panel
 * @param {{trigger:!HTMLElement}} eventData
 */
const toggleTreeChildren = (panel, eventData) => {
  const revealIcon = eventData.trigger;
  const elId = revealIcon.getAttribute('data-child-id');
  const child = panel.getElement().querySelector(`#${elId}`);
  toggleClass(child, 'tst__tree-children__hidden');
  toggleClass(revealIcon, 'tst__icon_rotated');
};


/**
 * Open all the tree nodes from the given element up.
 * @param {!Panel} panel
 * @param {!HTMLElement} n
 */
const openTreeFromNodeUp = (panel, n) => {
  const parentNode = n.parentElement;
  if (parentNode.classList.contains('children')) {
    enableClass(parentNode, 'tst__tree-children__hidden', false);
    openTreeFromNodeUp(panel, parentNode);
  }
};

/**
 * Determine if an element is in the viewport
 * @param  {Node} parent The element
 * @return {Function} Returns true if element is in the viewport
 */
const needsToScroll = parent => {
  const parentRect = parent.getBoundingClientRect();
  const bottomMustBeLessThan = parentRect.bottom;
  return elem => {
    const distance = elem.getBoundingClientRect();
    return distance.bottom > bottomMustBeLessThan
  };
};


export const treeNodeSelect = panel => id => {
  const treeContainer = panel.getElement().querySelector('.zv_tree_container');
  const isHidden = needsToScroll(treeContainer);
  const allNodes = panel.getElement().querySelectorAll('.tree-node');
  let targetNode = undefined;
  [...allNodes].forEach(n => {
    enableClass(n, 'mdc-deprecated-list-item--activated', n.id === `tree-node_${id}`);
    if (n.id === `tree-node_${id}`) {
      targetNode = n;
    }
  });

  if (targetNode && isHidden(targetNode)) {
    targetNode.scrollIntoView(false);
  }
};


export default class View extends EVT {

  //----------------------------------------------------------------[ Static ]--
  static viewEventCode() {
    return UiEventType.VIEW;
  }

  constructor() {
    super();

    /**
     * Set this to true to get some debug in the console.
     * @type {boolean}
     * @private
     */
    this.debugMode_ = false;

    /**
     * @type {Map<string, !Panel>}
     */
    this.panelMap = new Map();

    /**
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;


    this.split_ = void 0;

    this.panelEventMap_ = this.initPanelEventsInternal_();

    this.switchViewMap_ = new Map();

    /**
     * Arbitrary data object associated with the component.  Such as meta-data.
     * @private {*}
     */
    this.meta_data_ = new Map();

  };

  set split(split) {
    this.split_ = split;
    // this.listen(this.split_, UiEventType.SPLIT, e => {
    //   const eventValue = e.detail.getValue();
    //   const eventData = e.detail.getData();
    //   console.log(eventValue, eventData, this.disposed_, this.constructor.name);
    // });
    // console.log('LISTENRS', this.split_.numListeners)
    // this.split_.isObservedBy_.forEach(e => {
    //   console.log('    ', e.constructor.name, e.disposed_)
    // })
  }

  get split() {
    if (!this.split_) {
      throw 'No SPLIT component available'
    }
    return this.split_;
  }

  /**
   * @param {!UserManager} user
   */
  set user(user) {
    this.user_ = user;
    this.panelMap.forEach(panel => panel.user = user);
  };


  /**
   * @return {!UserManager}
   */
  get user() {
    if (!this.user_) {
      this.user_ = new UserManager();
    }
    return this.user_;
  };


  /**
   * Render each of the panels in this view.
   */
  render() {
    this.initPanelEvents();
    this.preRender();
    this.configurePanels();
    this.displayPanels();
    this.postRender();
  };

  /**
   * Placeholder for subclasses to add panel event functions.
   */
  initPanelEvents() {
  };


  /**
   * Run before the render.
   */
  preRender() {
  };

  /**
   * Placeholder for panel configuration functionality;
   */
  configurePanels() {
  }

  /**
   * Placeholder for panel display functionality;
   */
  displayPanels() {
  }

  /**
   * Placeholder for post render functionality.
   */
  postRender() {
  }


  /**
   * @inheritDoc
   */
  dispose() {
    [...this.panelMap.values()].forEach(panel => panel.dispose());
    super.dispose();
  };


  /**
   * Add a panel as a child of the view.
   * @param {string} name The name of the panel - used as a key in the panel map.
   * @param {!Panel} panel The panel itself.
   */
  addPanelToView(name, panel) {
    panel.user = this.user;
    this.removePanelByName(name);
    this.panelMap.set(name, panel);
    this.listen(panel, Panel.panelEventCode(), this.onPanelEvent.bind(this));
  };


  /**
   * Remove a panel from the view by name.
   * @param {string} name The name of the panel - used as a key in the panel map.
   */
  removePanelByName(name) {
    this.panelMap.has(name) && this.panelMap.get(name).dispose();
  };


  /**
   * @param {Panel} panel
   */
  removePanel(panel) {
    const [n, p] = [...this.panelMap.entries()].find(([k, v]) => v === panel);
    if (n && p) {
      p.dispose();
      this.panelMap.delete(n);
    }
  }


  /**
   * @param {string} name
   * @return {Panel|undefined}
   */
  getPanelByName(name) {
    return this.panelMap.get(name);
  };


  broadcastToPanels(data) {
    [...this.panelMap.values()].forEach(p => p.onViewDataBroadcast(data));
  }


  initPanelEventsInternal_() {
    return new Map()
        .set('toggle_tree', (eventData, ePanel) => {
          toggleTree(eventData, ePanel)
        })
        .set('tree_toggle-children', (eventData, ePanel) => {
          toggleTreeChildren(
              ePanel,
              /**@type {{trigger:!HTMLElement}}*/ (eventData))
        })
        .set('destroy_me', (eventData, ePanel) => {
          this.removePanel(ePanel);
        })
        .set('paginate', (eventData, ePanel) => {
          const href = `${eventData.href}?${eventData.targetval}`;
          this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          )
        })
        .set('search', (eventData, ePanel) => {
          let href = `${eventData.href}`;
          const qString = eventData.formData.q;
          const qDict = eventData.targetval;
          if (qString !== '') {
            href = `${href}?q=${qString}`
          }
          if (qDict !== '') {
            let newQDict = qDict;
            if (qDict.includes('page=')) {
              newQDict = qDict.split('&').filter(e => !e.includes('page=')).join('&');
            }
            href = qString !== '' ? `${href}&${newQDict}` : `${href}?${newQDict}`;
          }
          this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          )
        })
        .set('list_filter', (eventData, ePanel) => {
          const href = `${eventData.href}?${eventData.targetval}`;
          this.user.fetchAndSplit(href, ePanel.abortController.signal).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          )
        })
        .set('reset_search', (eventData, ePanel) => {
          // Grab the closest form up the DOM, reset its 'q' field and make
          // it use the normal submit logic.
          const form = eventData.trigger.closest('form');
          form.elements['q'].value = '';
          form.dispatchEvent(new Event('submit'));
        })
        .set('switch_view', (eventData, ePanel) => {
          this.debugMe('switch_view received: eventData', eventData);

          const href = eventData.href;
          const pk = eventData.pk;
          const view = eventData.view;
          const landOn = eventData.landon;
          const context = eventData.context;
          const landOnPk = eventData.landonpk;
          const displayAs = eventData.displayas;

          if (this.switchViewMap_.has(view)) {
            this.switchViewMap_.get(view)({
              view,
              pk,
              landOn,
              landOnPk,
              displayAs,
              href,
              context,
              eventData
            }, ePanel);
          } else {
            this.debugMe('NO VIEW FOUND FOR:', view, this.switchViewMap_);
          }
        });
  };

  mapPanEv(s, func) {
    this.panelEventMap_.set(s, func);
  }

  /**
   * A map of string to function where the function receives an object and
   * a panel.
   * @param {string} s
   * @param {function(
   *  {view:string, pk:string, landOn:string, href:string}, Panel):?} func
   */
  mapSwitchView(s, func) {
    this.switchViewMap_.set(s, func);
  }


  /**
   * @param {!CustomEvent} e
   */
  onPanelEvent(e) {
    const eventValue = e.detail.getValue();
    const eventData = e.detail.getData();
    const ePanel = /** @type {Panel} */ (e.target);
    if (this.panelEventMap_.has(eventValue)) {
      this.panelEventMap_.get(eventValue)(eventData, ePanel)
    } else {
      this.debugMe(`NO EVENT MATCH
          oPe: ${e}
          eventValue: ${eventValue}
          eventData: ${JSON.stringify(eventData, undefined, 2)}
          ePanel: ${ePanel.constructor.name}`);
    }
  };


  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.VIEW} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Component.compEventCode(), e => {
   *      console.log('B got', Component.compEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchViewEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.VIEW, dataObj);
    return this.dispatchEvent(event);
  };


  // ------------------------------------------------------------------------------[ Meta Data ]--
  /**
   * Returns the model associated with the UI component.
   * @return {*}
   */
  get meta_data() {
    return this.meta_data_
  }

  set_meta_data(k, v) {
    this.meta_data_.set(k, v);
    return this.meta_data;
  }

  get_meta_data(k) {
    return this.meta_data_.get(k);
  }

  has_meta_data(k) {
    return this.meta_data_.has(k);
  }


}
