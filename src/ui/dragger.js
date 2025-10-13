import Component from './component.js';
import {UiEventType} from '../events/uieventtype.js';
import {getPos} from '../dom/utils.js';
import {EV, normalizeEvent} from '../events/mouseandtouchevents.js';


/**
 * @param {Function} onStart
 * @param {Function} onMove
 * @param {Function} onEnd
 * @param {string} degreesOfFreedom
 * @return {function(!Event)}
 */
const dragStartListener = (onStart, onMove, onEnd, degreesOfFreedom) =>
  event => {
    event.preventDefault();
    const ev = normalizeEvent(event);
    const target = /** @type {!HTMLElement} */ (ev.currentTarget);
    const [left, top] = getPos(target);
    const xOrg = ev.clientX - left;
    const yOrg = ev.clientY - top;

    // let didMove = false;
    const startEmit = onStart(left, top, xOrg, yOrg, target);
    const endEmit = onEnd(left, top, xOrg, yOrg, target);
    const moveEmit = onMove(left, top, xOrg, yOrg, target);

    // Drag move.
    let dragFunc = freeMoveListener(moveEmit, target, xOrg, yOrg);
    if (['x', 'ew'].includes(degreesOfFreedom)) {
      dragFunc = xMoveOnlyListener(moveEmit, target, xOrg, yOrg);
    } else if (['y', 'ns'].includes(degreesOfFreedom)) {
      dragFunc = yMoveOnlyListener(moveEmit, target, xOrg, yOrg);
    }

    let didMove = false;
    const df = (e) => {
      didMove = true;
      dragFunc(e);
    };

    const cancelFunc = e => {
      document.removeEventListener(EV.MOUSEMOVE, df, true);
      document.removeEventListener(EV.TOUCHMOVE, df, true);
      document.removeEventListener(EV.MOUSEUP, cancelFunc, true);
      document.removeEventListener(EV.TOUCHEND, cancelFunc, true);
      if (didMove) {
        endEmit(e);
      }
    };

    document.addEventListener(EV.MOUSEUP, cancelFunc, true);
    document.addEventListener(EV.TOUCHEND, cancelFunc, true);
    document.addEventListener(EV.MOUSEMOVE, df, true);
    document.addEventListener(EV.TOUCHMOVE, df, true);
    startEmit(event);

    return cancelFunc;
  };


/**
 * @param {!Function} emit
 * @param {!HTMLElement} target
 * @param {number} xOrg
 * @param {number} yOrg
 * @return {!Function}
 */
const freeMoveListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.left = `${ev.clientX - xOrg}px`;
  target.style.top = `${ev.clientY - yOrg}px`;
  emit(ev);
};

// noinspection JSUnusedLocalSymbols
const xMoveOnlyListener = (emit, target, xOrg, _yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.left = `${ev.clientX - xOrg}px`;
  emit(ev);
};

const yMoveOnlyListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.top = `${ev.clientY - yOrg}px`;
  emit(ev);
};

//------------------------------------------------------------------[ Event Emitters ]--
/**
 * Creates an event emitter function for drag events. Returns a curried function
 * that captures initial position data and returns a final function that dispatches
 * the event with calculated deltas.
 * @param {!Component} comp The component that will dispatch the event
 * @param {string} evType The event type to dispatch
 * @return {function(number, number, number, number, !HTMLElement):function(!Event)}
 *     A function that captures position data and returns an event handler
 */
const makeEmitter = (comp, evType) => (left, top, xOrg, yOrg, target) => ev => {
  comp.dispatchCompEvent(evType, {
    component: comp,
    browserEvent: ev,
    left: left,
    top: top,
    clientX: ev.clientX,
    clientY: ev.clientY,
    xOrg: xOrg,
    yOrg: yOrg,
    deltaX: ev.clientX - xOrg - left,
    deltaY: ev.clientY - yOrg - top,
    target: target
  });
};

/**
 * A draggable component that can be moved around the screen. Supports restricted
 * movement in X, Y, or both directions. Dispatches drag start, move, and end events.
 *
 * @extends {Component}
 */
class Dragger extends Component {
  #degreesOfFreedom;
  #dragHandle;
  #isLocked;
  #cancelDrag;

  /**
   * @param {string} freedom Restrict the directions in which the
   * dragger can be moved.
   */
  constructor(freedom = 'xy') {
    super();

    /**
     * @type {string}
     * @private
     */
    this.#degreesOfFreedom = ['x', 'y', 'xy', 'ew', 'ns'].includes(freedom.toLowerCase())
      ? freedom.toLowerCase()
      : 'xy';

    /**
     * @type {!Node|undefined}
     * @private
     */
    this.#dragHandle = void 0;

    /**
     * Track state. A dragger can either be locked (not draggable) or
     * unlocked (draggable).
     * Once unlocked, calling unlock again will not add more listeners.
     * The default state is locked, but the moment the component renders,
     * it becomes unlocked - by default;
     * @type {boolean}
     * @private
     */
    this.#isLocked = true;


    // noinspection JSUnusedLocalSymbols
    this.#cancelDrag = _e => null;

  };

  /**
   * Cancels the current drag operation in progress, if any.
   * @param {!Event} event The event that triggered the cancel
   */
  cancelDrag(event) {
    this.#cancelDrag(event);
  }

  //-----------------------------------------------------------[ Getters and Setters ]--
  /**
   * Sets the direction in which the component can be dragged.
   * Only 'x' or 'y' will lock the movements to those directions.
   * Anything else will be considered free movement
   * @param {string} axis
   */
  set moveFreedom(axis) {
    this.#degreesOfFreedom = axis;
    // Make sure we update the existing movement.
    if (!this.#isLocked) {
      this.lock();
      this.unlock();
    }
  }

  /**
   * Get the direction in which this component can move.
   * @return {string}
   */
  get moveFreedom() {
    return this.#degreesOfFreedom;
  }


  //----------------------------------------------------------------------[ Override ]--
  /**
   * @inheritDoc
   */
  executeBeforeReady() {
    this.unlock();
    super.executeBeforeReady();
  }

  //--------------------------------------------------------------[ Dragger Specific ]--
  /**
   * Make the component draggable
   */
  unlock() {
    const wrapperFunc = func => e => {
      this.#cancelDrag = func(e);
    };
    if (this.isInDocument && this.#isLocked) {
      const onMove = makeEmitter(this, UiEventType.COMP_DRAG_MOVE);
      const onStart = makeEmitter(this, UiEventType.COMP_DRAG_START);
      const onEnd = makeEmitter(this, UiEventType.COMP_DRAG_END);
      const dragFunc = dragStartListener(
        onStart, onMove, onEnd, this.#degreesOfFreedom);
      this.#isLocked = false;
      this.#dragHandle = /** @type {!Node} */ (
        this.#dragHandle || this.getElement());
      this.listen(this.#dragHandle, EV.MOUSEDOWN, wrapperFunc(dragFunc));
      this.listen(this.#dragHandle, EV.TOUCHSTART, dragFunc);
      this.#dragHandle.classList.remove('locked');
    }
  }

  /**
   * Lock the component in place.
   * Removes all the listeners added when it was made draggable.
   */
  lock() {
    this.stopListeningTo(this.#dragHandle, EV.MOUSEDOWN);
    this.stopListeningTo(this.#dragHandle, EV.TOUCHSTART);
    this.#isLocked = true;
    this.#dragHandle.classList.add('locked');
  }
}


export default Dragger;
