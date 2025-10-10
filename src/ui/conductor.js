import UserManager from '../user/usermanager.js';
import EVT from './evt.js';
import View from './view.js';

/**
 * The Conductor orchestrates view management and navigation in the application.
 * It maintains the active view, manages view transitions, handles browser history,
 * and coordinates communication between views via events.
 *
 * @extends {EVT}
 */
export default class Conductor extends EVT {
  /**
   * Creates a new Conductor instance. Sets up browser history listening
   * and initializes view event handling.
   */
  constructor() {
    super();

    this.activeView_ = null;

    /**
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;

    this.split_ = void 0;

    this.viewEventMap_ = this.initViewEventsInternal_();

    this.viewConstructorMap_ = new Map();

    window.addEventListener('popstate', (event) => {
      if (event.state === null) {
        return;
      }
      this.navTo(event.state);
    });

  };

  set split(split) {
    this.split_ = split;
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
    if (this.activeView_) {
      this.activeView_.user = this.user;
    }
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
   * Initializes the internal view event map with default event handlers.
   * Sets up handlers for common view events like 'switch_view'.
   * @return {!Map<string, !Function>} Map of event names to handler functions
   * @private
   */
  initViewEventsInternal_() {
    return new Map()
      .set('switch_view', (eventData, eView) => {
        if (this.viewConstructorMap_.has(eventData.view)) {
          const view = this.viewConstructorMap_.get(eventData.view)(
            eventData.pk, eventData);
          this.switchView(view);
        }
      });
  };

  /**
   * Maps a view event name to a handler function. Allows dynamic registration
   * of custom view event handlers at runtime.
   * @param {string} s The event name to map
   * @param {!Function} func The handler function that receives (eventData, eView)
   */
  mapViewEv(s, func) {
    this.viewEventMap_.set(s, func);
  }

  /**
   * Registers a view constructor function that can be used to create instances
   * of a specific view type.
   * @param {string} s The view type identifier
   * @param {!Function} f Constructor function that receives (pk, data) and returns a View
   */
  registerViewConstructor(s, f) {
    this.viewConstructorMap_.set(s, f);
  }

  /**
   * @param {!CustomEvent} e Event object.
   */
  onViewEvent(e) {
    const eventValue = e.detail.getValue();
    const eventData = e.detail.getData();
    const eView = /** @type {Panel} */ (e.target);
    if (this.viewEventMap_.has(eventValue)) {
      this.viewEventMap_.get(eventValue)(eventData, eView);
    } else {
      console.log('Unhandled VIEW Event:', e, eventValue, eventData, eView);
    }
  };

  /**
   * Make the given view active.
   * @param {!View} view
   */
  setActiveView(view) {
    if (this.activeView_) {
      this.stopListeningTo(this.activeView_);
      this.activeView_.dispose();
      this.activeView_ = null;
      delete this.activeView_;
    }
    this.activeView_ = view;
    this.activeView_.render();
  };

  /**
   * @param {!View} view
   * @returns {!View}
   */
  initView(view) {
    view.user = this.user;
    view.split = this.split;
    view.recordHistory = this.recordHistory.bind(this);
    view.registerViewConstructor = this.registerViewConstructor.bind(this);
    this.listen(view, View.viewEventCode(), this.onViewEvent.bind(this));
    return view;
  }

  //-------------------------------------------------------[ Views Utilities ]--
  /**
   * @param {!View} view The view we want active.
   */
  switchView(view) {
    this.setActiveView(this.initView(view));
  };

  // -----------------------------------------------[ History and Navigation ]--
  /**
   * Records the given item in browser history. If item.init is true, replaces
   * the current history state. Otherwise, pushes a new history state unless
   * item.history is true.
   * @param {!Object} item The history item containing view state
   */
  recordHistory(item) {
    this.debugMe('HISTORY', item);
    if (item.init) {
      history.replaceState(item, '', document.location.href);
    } else if (!item.history) {
      history.pushState(item, '', null);
    }
  }

  /**
   * Navigates to a specific view based on the history item. Attempts to use
   * the active view's switchViewMap first, falling back to registered view
   * constructors if needed.
   * @param {!Object} item History item containing {view, pk, ...} properties
   */
  navTo = (item) => {
    item.history = true;
    const view = item.view;
    const activeView = this.activeView_;

    if (activeView.switchViewMap_.has(view)) {
      this.debugMe('NAV:VIEW:MAP', item);
      activeView.switchViewMap_.get(view)(item);
    } else if (this.viewConstructorMap_.has(view)) {
      const targetView = this.viewConstructorMap_.get(view)(item.pk, item);
      this.debugMe('NAV:NEW:VIEW', item);
      this.switchView(targetView);
    }
  };


};
