import {isDef} from 'badu';

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

/**
 * Base class for event-driven components. Extends EventTarget with enhanced
 * event listener management, automatic cleanup, and interval tracking.
 * Provides a foundation for components that need to listen to and dispatch
 * events while maintaining proper lifecycle management.
 */
export default class EVT extends EventTarget {

  /**
   * Set this to true to get some debug in the console.
   * @type {boolean}
   * @private
   */
  #debugMode = false;

  /**
   * True if this is disposed.
   * @type {boolean}
   * @private
   */
  #disposed = false;


  /**
   * A map of listener targets to an object of event: functions
   * When adding a listener, immediately also create the un-listen functions
   * and store those in an object keyed with the event.
   * Store these objects against the target in a map
   * @type {Map<!EventTarget, !Object<string, !Function>>}
   * @private
   */
  #listeningTo = new Map();

  /**
   * A set of components that are currently listening to this component
   * @type {!Set<!EventTarget>}
   * @private
   */
  #isObservedBy = new Set();


  /**
   * A set of interval timers as defined by setInterval.
   * Use this to store the timers created particular to this component.
   * On destruction, these timers will be cleared.
   * @type {Set<any>}
   * @private
   */
  #activeIntervals = new Set();


  //--[ Static ]--
  /**
   * Creates a CustomEvent with the given type and data payload.
   * @param {string} event The event type
   * @param {*} data The data to attach to the event's detail property
   * @return {!CustomEvent} A new CustomEvent instance
   */
  static makeEvent(event, data) {
    return new CustomEvent(event, {detail: data});
  };

  /**
   * Sets debug mode for this component. When enabled, debug messages
   * will be logged to the console.
   * @param {boolean} bool True to enable debug mode, false to disable
   * @throws {Error} If the value is not a boolean
   */
  set debugMode(bool) {
    if ((typeof bool) !== 'boolean') {
      throw new Error('This must be a boolean');
    }
    this.#debugMode = bool;
  }

  get debugMode() {
    return this.#debugMode;
  }

  /**
   * Returns whether this component has been disposed.
   * @return {boolean} True if disposed, false otherwise
   */
  get disposed() {
    return this.#disposed;
  }

  /**
   * Returns the map of targets this component is listening to.
   * @return {!Map<!EventTarget, !Object<string, !Function>>} Map of targets to their event handlers
   */
  get listeningTo() {
    return this.#listeningTo;
  }

  get isObservedBy() {
    return this.#isObservedBy;
  }

  get activeIntervals() {
    return this.#activeIntervals;
  }

  /**
   * Logs debug messages to the console if debug mode is enabled.
   * Automatically prepends the constructor name to the output.
   * @param {...*} s Arguments to log
   */
  debugMe(...s) {
    if (this.#debugMode) {
      console.log.apply(null, [this.constructor.name, 'DEBUG:', ...s]);
    }
  }


  //--[ Listeners and Listening ]--
  /**
   * @param {!EventTarget|!EVT} comp
   */
  isListenedToBy(comp) {
    this.#isObservedBy.add(comp);
  }

  /**
   * WARNING! DO not use options={passive: true} here. It disallows us to
   * use preventDefault when we intercept the form, and that leads to a
   * general inability to POST forms.
   *
   * @param {!EventTarget|!EVT|!Node} target
   * @param {string} event
   * @param {!Function} action
   * @param {boolean|!Object} options
   */
  listen(target, event, action, options = false) {
    target.addEventListener(event, action, options);
    const currVal = this.listeningTo.get(target) || {};
    currVal[event] = () => target.removeEventListener(event, action, options);
    this.listeningTo.set(target, currVal);

    if (isDef(target.isListenedToBy)) {
      target.isListenedToBy(this);
    }
  };

  /**
   * Remove self from all components tt are listening to me.
   */
  stopBeingListenedTo() {
    for (const observer of this.isObservedBy) {
      observer.stopListeningTo(this);
      this.isObservedBy.delete(observer);
    }
  }

  /**
   * Stop listening to all events on target.
   * @param {!EventTarget|!EVT|!Node|undefined} target
   * @param {string=} opt_event
   */
  stopListeningTo(target, opt_event) {
    if (!target) {
      return;
    }
    if (this.listeningTo.has(target)) {

      if (isDef(target.isObservedBy)) {
        target.isObservedBy.delete(this);
      }

      if (isDef(opt_event)) {
        Object
          .entries(this.listeningTo.get(target))
          .forEach(([key, value]) => {
            if (key === opt_event) {
              /** @type {!Function} */(value)();
            }
          });
        if (!Object.keys(this.listeningTo.get(target)).length) {
          this.listeningTo.delete(target);
        }
      } else {
        Object.values(this.listeningTo.get(target)).forEach(e => e());
        this.listeningTo.delete(target);
      }

    }
  }

  /**
   * Removes all the event listeners that is managed by this
   * component.
   */
  removeAllListener() {
    for (const target of this.listeningTo.keys()) {
      this.stopListeningTo(target);
    }
  }

  /**
   * Clears all active intervals created by this component.
   * Called automatically during disposal to prevent memory leaks.
   */
  clearAllIntervals() {
    for (const interval of this.activeIntervals) {
      clearInterval(interval);
      this.activeIntervals.delete(interval);
    }
  }

  /**
   * Executes a function repeatedly at a specified interval.
   * The interval is tracked and will be automatically cleared on disposal.
   * @param {!Function} f The function to execute on each interval
   * @param {number} interval The interval in milliseconds
   */
  doOnBeat(f, interval) {
    const clearInt = setInterval(f, interval);
    this.activeIntervals.add(clearInt);
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
    this.clearAllIntervals();
    this.#disposed = true;
  };

  /**
   * Public method to dispose of this component. Calls disposeInternal()
   * to perform cleanup of event listeners, intervals, and observers.
   * After calling this method, the component should not be used.
   */
  dispose() {
    this.disposeInternal();
  }

}
