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

    this.viewConstructorMap_ = new Map();

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
          if (this.viewConstructorMap_.has(eventData.view)) {
            const view = this.viewConstructorMap_.get(eventData.view)(
                eventData.pk, eventData);
            this.switchView(view);
          }
        })
  };

  mapViewEv(s, func) {
    this.viewEventMap_.set(s, func);
  }

  registerViewConstructor(s, f) {
    this.viewConstructorMap_.set(s, f);
  }

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

  initView(view) {
    view.user = this.user;
    view.split = this.split;
    // view.switchView = this.switchView.bind(this);
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



};
