import UserMananger from '../user/usermanager.js';
import EVT from './evt.js';
import { UiEventType } from '../events/uieventtype.js'


export default class Conductor extends EVT {
  constructor() {
    super();

    this.viewEventMap_ = new Map();
    this.activeView_ = null;

    /**
     * @type {!UserManager|undefined}
     * @private
     */
    this.user_ = void 0;

    this.split_ = void 0;
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
    if (this.viewEventMap_.has(eventValue)) {
      [...this.viewEventMap_.get(eventValue)].forEach(
          f => f(this, eventValue, eventData))
    }
  };

  registerViewEventHandler(eventValue, handler) {
    if (this.viewEventMap_.has(eventValue)) {
      this.viewEventMap_.get(eventValue).add(handler);
    } else {
      this.viewEventMap_.set(eventValue, new Set().add(handler))
    }
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
    this.activeView_.user = this.user;
    this.activeView_.split = this.split;
    this.activeView_.switchView = this.switchView.bind(this);
    this.listen(
        this.activeView_, UiEventType.VIEW, this.onViewEvent);
    this.activeView_.render();
  };

  //-------------------------------------------------------[ Views Utilities ]--
  /**
   * @param {!View} view
   */
  switchView(view) {
    this.setActiveView(view);
  };



};
