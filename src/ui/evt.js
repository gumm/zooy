import { isDef, makeRandomString } from "../../node_modules/badu/badu.js";

/*
EVENT LISTENER LEAK DETECTOR

var listenerCount = 0;
(function() {
    var ael = Node.prototype.addEventListener;
    Node.prototype.addEventListener = function() {
         listenerCount++;
         ael.apply(this, arguments);
    }
    var rel = Node.prototype.removeEventListener;
    Node.prototype.removeEventListener = function() {
         listenerCount--;
         rel.apply(this, arguments);
    }
})();

 */

export default class EVT extends EventTarget {

  //----------------------------------------------------------------[ Static ]--
  static makeEvent(event, data)  {
    return new CustomEvent(event, {detail: data});
  };

  constructor() {
    super();

    /**
     * A map of listener targets to a object of event: functions
     * When adding a listener, immediately also create the un-listen functions
     * and store those in a object keyed with the event.
     * Store these objects against the target in a map
     * @type {Map<!EventTarget, !Object<string, !Function>>}
     * @private
     */
    this.listeningTo_ = new Map();

    /**
     * A set of components that are currently listening to this component
     * @type {!Set<!EventTarget>}
     * @private
     */
    this.isObservedBy_ = new Set();

    /**
     * True if this is disposed.
     * @type {boolean}
     * @private
     */
    this.disposed_ = false;

  };


  //-----------------------------------------------[ Listeners and Listening ]--
  /**
   * @param {!EventTarget|!EVT} comp
   */
  isListenedToBy(comp) {
    this.isObservedBy_.add(comp);
  }

  /**
   * @param {!EventTarget|!EVT|!Node} target
   * @param {string} event
   * @param {!Function} action
   * @param {boolean|!Object} options
   */
  listen(target, event, action, options=false) {
    target.addEventListener(event, action, options);
    const currVal = this.listeningTo_.get(target) || {};
    currVal[event] = () => target.removeEventListener(event, action, options);
    this.listeningTo_.set(target, currVal);

    if (isDef(target.isListenedToBy)) {
      target.isListenedToBy(this);
    }
  };

  /**
   * Remove self from all components tt are listening to me.
   */
  stopBeingListenedTo() {
    for (const observer of this.isObservedBy_) {
      observer.stopListeningTo(this);
      this.isObservedBy_.delete(observer);
    }
  }

  /**
   * Stop listening to all events on target.
   * @param {!EventTarget|!EVT|!Node|undefined} target
   * @param {string=} opt_event
   */
  stopListeningTo(target, opt_event) {
    if (!target) { return }
    if (this.listeningTo_.has(target)) {

      if (isDef(target.isObservedBy_)) {
        target.isObservedBy_.delete(this);
      }

      if (isDef(opt_event)) {
        Object
            .entries(this.listeningTo_.get(target))
            .forEach(([key, value]) => {
              if (key === opt_event) {
                /** @type {!Function} */(value)();
              }
            });
        if (!Object.keys(this.listeningTo_.get(target)).length) {
          this.listeningTo_.delete(target);
        }
      } else {
        Object.values(this.listeningTo_.get(target)).forEach(e => e());
        this.listeningTo_.delete(target);
      }

    }
  }

  /**
   * Removes all the event listeners that is managed by this
   * component.
   */
  removeAllListener() {
    for (const target of this.listeningTo_.keys()) {
      this.stopListeningTo(target);
    }
  }


  /**
   * Disposes of the component.  Calls `exitDocument`, which is expected to
   * remove event handlers and clean up the component.  Propagates the call to
   * the component's children, if any. Removes the component's DOM from the
   * document unless it was decorated.
   * @protected
   */
  disposeInternal() {
    this.stopBeingListenedTo();
    this.removeAllListener();
    this.disposed_ = true;
  };

  dispose() {
    this.disposeInternal();
  }

}