import UserMananger from '../user/usermanager.js';
import EVT from './evt.js';
import View from './view.js';


export default class Conductor extends EVT {
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

    this.switchViewMap_ = new Map();
  };

  set split(split) {
    this.split_ = split;
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
    if (this.activeView_) {
      this.activeView_.user = this.user;
    }
  };


  /**
   * @return {!UserManager}
   */
  get user() {
    if (!this.user_) {
      this.user_ = new UserMananger();
    }
    return this.user_;
  };


  /**
   * @param {!CustomEvent} e Event object.
   */
  onViewEvent(e) {
    const eventValue = e.detail.getValue();
    const eventData = e.detail.getData();
    const eView = /** @type {Panel} */ (e.target);
    if (this.viewEventMap_.has(eventValue)) {
      this.viewEventMap_.get(eventValue)(eventData, eView)
    } else {
      console.log('Unhandled VIEW Event:', e, eventValue, eventData, eView);
    }
  };

  initViewEventsInternal_() {
    return new Map()
        .set('switch_view', (eventData, eView) => {
          if (this.switchViewMap_.has(eventData.viewType)) {
            this.switchViewMap_.get(eventData.viewType)(eventData, eView)
          }
        })
  };

  mapViewEv(s, func) {
    this.viewEventMap_.set(s, func);
  }

  mapSwitchView(s, func) {
    this.switchViewMap_.set(s, func);
  }

  /**
   * Make the given view active.
   * @param {!View} view
   */
  setActiveView(view) {
    if (this.activeView_) {
      this.activeView_.dispose();
    }
    this.activeView_ = view;
    this.activeView_.render();
  };

  initView(view) {
    view.user = this.user;
    view.split = this.split;
    view.switchView = this.switchView.bind(this);
    view.mapSwitchView = this.mapSwitchView.bind(this);
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



};
