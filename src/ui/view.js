import EVT from './evt.js';
import {UiEventType} from '../events/uieventtype.js';
import ZooyEventData from '../events/zooyeventdata.js';
import UserManager from '../user/usermanager.js';
import Panel from './panel.js';
import {identity} from 'badu';
// Temporary imports for backwards compatibility - will be removed as apps migrate
import {SearchHandlers, QueryParamHandlers} from './handlers/index.js';

/**
 * A View orchestrates multiple panels and manages their interactions.
 * Views handle panel events, coordinate with the split component for layout,
 * manage navigation, and communicate with the Conductor for view switching.
 * Each view represents a distinct application state or screen.
 *
 * @extends {EVT}
 */
export default class View extends EVT {

  //--[ Static ]--
  /**
   * Returns the view event type code used for dispatching view events.
   * @return {string} The VIEW event type
   */
  static viewEventCode() {
    return UiEventType.VIEW;
  }

  /**
   * Creates a new View instance. Initializes panel management, event handling,
   * and metadata storage.
   */
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
    this.metaData_ = new Map();


    this.recordHistory_ = void 0;

    this.registerViewConstructor_ = void 0;

  };

  set recordHistory(func) {
    this.recordHistory_ = func;
  }

  get recordHistory() {
    return this.recordHistory_;
  }

  set registerViewConstructor(func) {
    this.registerViewConstructor_ = func;
  }

  get registerViewConstructor() {
    return this.registerViewConstructor_;
  }

  set split(split) {
    this.split_ = split;
    this.listen(this.split_, UiEventType.SPLIT, e => {
      const eventValue = e.detail.getValue();
      const eventData = e.detail.getData();
      switch (eventValue) {
        case UiEventType.SPLIT_WILL_OPEN:
          this.onSplitWillOpen(eventData);
          break;
        case UiEventType.SPLIT_WILL_CLOSE:
          this.onSplitWillClose(eventData);
          break;
        case UiEventType.SPLIT_DID_CLOSE:
          this.onSplitDidClose(eventData);
          break;
        case UiEventType.SPLIT_DID_OPEN:
          this.onSplitDidOpen(eventData);
          break;
        case UiEventType.SPLIT_TRANSITION_END:
          break;
        default:
          identity();
      }
    });
  }

  get split() {
    if (!this.split_) {
      throw new Error('No SPLIT component available');
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
    const [n, p] = [...this.panelMap.entries()].find(([_k, v]) => v === panel);
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

  /**
   * Broadcasts data to all panels in this view. Each panel receives the data
   * via its onViewDataBroadcast method.
   * @param {*} data The data to broadcast to all panels
   */
  broadcastToPanels(data) {
    [...this.panelMap.values()].forEach(p => p.onViewDataBroadcast(data));
  }

  /**
   * Initializes the internal panel event map with default event handlers.
   * Sets up handlers for panel lifecycle and view coordination.
   *
   * Note: This method also registers application-specific handlers (search,
   * pagination, etc.) for backwards compatibility. These will be removed in
   * a future version - applications should explicitly register handlers they need.
   *
   * @return {!Map<string, !Function>} Map of event names to handler functions
   * @private
   */
  initPanelEventsInternal_() {
    const map = new Map();

    // Framework-level handlers (stay in View)
    map.set('destroy_me', (eventData, ePanel) => {
      this.removePanel(ePanel);
    });

    map.set('switch_view', (eventData, ePanel) => {
      this.debugMe('switch_view received: eventData', eventData);
      const view = eventData.view;
      if (this.switchViewMap_.has(view)) {
        this.switchViewMap_.get(view)(eventData, ePanel);
      } else {
        this.debugMe('NO VIEW FOUND FOR:', view, this.switchViewMap_);
      }
    });

    // Temporary: Application-specific handlers for backwards compatibility
    // These will be removed - applications should register these explicitly
    Object.entries({
      ...SearchHandlers,
      ...QueryParamHandlers
    }).forEach(([name, handler]) => {
      map.set(name, handler.bind(this));
    });

    return map;
  };

  /**
   * Maps a panel event name to a handler function. Allows dynamic registration
   * of custom panel event handlers at runtime.
   * @param {string} s The event name to map
   * @param {!Function} func The handler function that receives (eventData, ePanel)
   */
  mapPanEv(s, func) {
    this.panelEventMap_.set(s, func);
  }

  /**
   * A map of string to function where the function receives an object and
   * a panel.
   * @param {string} s
   * @param {function(
   *  {view:string, pk:string, emit:string, href:string}, Panel):?} func
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
      this.panelEventMap_.get(eventValue)(eventData, ePanel);
    } else {
      this.debugMe(`NO EVENT MATCH
          oPe: ${e}
          eventValue: ${eventValue}
          eventData: ${JSON.stringify(eventData, undefined, 2)}
          ePanel: ${ePanel.constructor.name}`);
    }
  };

  //--[ Split Events ]--
  /**
   * Triggered before a split will open.
   *
   * @param {{nestName: !string, nestEl:!HTMLElement}} _data
   */
  onSplitWillOpen(_data) {
  }

  /**
   * Triggered before a split will close.
   *
   * @param {{nestName: !string, nestEl:!HTMLElement}} _data
   */
  onSplitWillClose(_data) {
  }

  /**
   * Triggered after a split closed.
   *
   * @param {{nestName: !string, nestEl:!HTMLElement}} _data
   */
  onSplitDidClose(_data) {
  }

  /**
   * Triggered after a split opened.
   *
   * @param {{nestName: !string, nestEl:!HTMLElement}} _data
   */
  onSplitDidOpen(_data) {
  }

  //--[ Built in events ]--
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


  //--[  Meta Data ]--
  /**
   * Returns the metadata map associated with this view.
   * @return {!Map<string, *>} The metadata map
   */
  get metaData() {
    return this.metaData_;
  }

  /**
   * Sets a metadata key-value pair for this view.
   * @param {string} k The metadata key
   * @param {*} v The metadata value
   * @return {!Map<string, *>} The updated metadata map
   */
  setMetaData(k, v) {
    this.metaData_.set(k, v);
    return this.metaData;
  }

  /**
   * Retrieves a metadata value by key.
   * @param {string} k The metadata key
   * @return {*} The metadata value, or undefined if not found
   */
  getMetaData(k) {
    return this.metaData_.get(k);
  }

  /**
   * Checks if a metadata key exists.
   * @param {string} k The metadata key
   * @return {boolean} True if the key exists, false otherwise
   */
  hasMetaData(k) {
    return this.metaData_.has(k);
  }


}
