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


export const treeNodeSelect = panel => id => {
  const allNodes = panel.getElement().querySelectorAll('.tree-node');
  [...allNodes].forEach(n =>
      enableClass(n, 'mdc-list-item--activated', n.id === `tree-node_${id}`));
};


export default class View extends EVT {

  //----------------------------------------------------------------[ Static ]--
  static viewEventCode() {
    return UiEventType.VIEW;
  }

  constructor() {
    super();

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
  initPanelEvents() {};


  /**
   * Run before the render.
   */
  preRender() {};

  /**
   * Placeholder for panel configuration functionality;
   */
  configurePanels() {}

  /**
   * Placeholder for panel display functionality;
   */
  displayPanels() {}

  /**
   * Placeholder for post render functionality.
   */
  postRender() {}


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
          this.user.fetchAndSplit(eventData.href).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          )
        })
        .set('search', (eventData, ePanel) => {
          const href = `${eventData.href}?q=${eventData.formData.q}`;
          this.user.fetchAndSplit(href).then(
              s => ePanel.onReplacePartialDom(s, eventData.zvptarget)
          )
        })
        .set('switch_view', (eventData, ePanel) => {
          // console.log('switch_view received: eventData', eventData);

          const href = eventData.href;
          const pk = eventData.pk;
          const view = eventData.view;
          const landOn =  eventData.landon;
          const landOnPk =  eventData.landonpk;

          if (this.switchViewMap_.has(view)) {
            this.switchViewMap_.get(view)({view, pk, landOn, landOnPk, href}, ePanel);
          } else {
            console.log('NO VIEW FOUND FOR:', view, this.switchViewMap_);
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
      console.log('NO EVENT MATCH' +
          '\n oPe:', e,
          '\n eventValue:', eventValue,
          '\n eventData:', eventData,
          '\n ePanel:', ePanel);
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

}
