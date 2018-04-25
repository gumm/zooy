import Component from './component.js';
import {UiEventType} from '../events/uieventtype.js';
import {getPos} from '../dom/utils.js';
import {EV, normalizeEvent} from '../events/mouseandtouchevents.js';


/**
 * @param {Function} onStart
 * @param {Function} onMove
 * @param {Function} onEnd
 * @param {string} degreesOfFreedom
 * @return {function<Event>}
 */
const dragStartListener = (onStart, onMove, onEnd, degreesOfFreedom) =>
    event => {
      event.preventDefault();
      const ev = normalizeEvent(event);
      const target = /** @type {!HTMLElement} */ ev.currentTarget;
      const [left, top] = getPos(target);
      const xOrg = ev.clientX - left;
      const yOrg = ev.clientY - top;

      const startEmit = onStart(left, top, xOrg, yOrg, target);
      const endEmit = onEnd(left, top, xOrg, yOrg, target);
      const moveEmit = onMove(left, top, xOrg, yOrg, target);

      // Drag move.
      let dragFunc = freeMoveListener(moveEmit, target, xOrg, yOrg);
      if (degreesOfFreedom === 'x') {
        dragFunc = xMoveOnlyListener(moveEmit, target, xOrg, yOrg);
      } else if (degreesOfFreedom === 'y') {
        dragFunc = yMoveOnlyListener(moveEmit, target, xOrg, yOrg);
      }

      const cancelFunc = e => {
        document.removeEventListener(EV.MOUSEMOVE, dragFunc, true);
        document.removeEventListener(EV.TOUCHMOVE, dragFunc, true);
        document.removeEventListener(EV.MOUSEUP, cancelFunc, true);
        document.removeEventListener(EV.TOUCHEND, cancelFunc, true);
        endEmit(e);
      };

      document.addEventListener(EV.MOUSEUP, cancelFunc, true);
      document.addEventListener(EV.TOUCHEND, cancelFunc, true);
      document.addEventListener(EV.MOUSEMOVE, dragFunc, true);
      document.addEventListener(EV.TOUCHMOVE, dragFunc, true);
      startEmit(event);
    };


/**
 * @param {Function} emit
 * @param {HTMLElement} target
 * @param {number} xOrg
 * @param {number} yOrg
 * @return {Function}
 */
const freeMoveListener = (emit, target, xOrg, yOrg) => event => {
  event.preventDefault();
  const ev = normalizeEvent(event);
  target.style.left = `${ev.clientX - xOrg}px`;
  target.style.top = `${ev.clientY - yOrg}px`;
  emit(ev);
};

const xMoveOnlyListener = (emit, target, xOrg, yOrg) => event => {
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

//--------------------------------------------------------[ Event Emitters ]--
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
  })
};


class Dragger extends Component {

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
    this.degreesOfFreedom_ = ['x', 'y', 'xy'].includes(freedom)
        ? freedom
        : 'xy';

    /**
     * @type {?Element}
     * @private
     */
    this.dragHandle_ = null;

    /**
     * Track state. A dragger can either be locked (not draggable) or
     * unlocked (draggable).
     * Once unlocked, calling unlock again will not add more listeners.
     * The default state is locked, but the moment the component renders,
     * it becomes unlocked - by default;
     * @type {boolean}
     * @private
     */
    this.isLocked_ = true;

  };

  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * Sets the direction in which the component can be dragged.
   * Only 'x' or 'y' will lock the movements to those directions.
   * Anything else will be considered free movement
   * @param {string} axis
   */
  set moveFreedom(axis) {
    this.degreesOfFreedom_ = axis;
    // Make sure we update the existing movement.
    if (!this.isLocked_) {
      this.lock();
      this.unlock();
    }
  }

  /**
   * Get the direction in which this component can move.
   * @return {string}
   */
  get moveFreedom() {
    return this.degreesOfFreedom_
  }


  //--------------------------------------------------------------[ Override ]--
  /**
   * @inheritDoc
   */
  executeBeforeReady() {
    this.unlock();
    super.executeBeforeReady();
  }

  //------------------------------------------------------[ Dragger Specific ]--
  /**
   * Make the component draggable
   */
  unlock() {
    if (this.isInDocument && this.isLocked_) {
      const onMove = makeEmitter(this, UiEventType.COMP_DRAG_MOVE);
      const onStart = makeEmitter(this, UiEventType.COMP_DRAG_START);
      const onEnd = makeEmitter(this, UiEventType.COMP_DRAG_END);
      const dragFunc = dragStartListener(
          onStart, onMove, onEnd, this.degreesOfFreedom_);
      this.isLocked_ = false;
      this.dragHandle_ = this.dragHandle_ || this.getElement();
      this.listen(this.dragHandle_, EV.MOUSEDOWN, dragFunc);
      this.listen(this.dragHandle_, EV.TOUCHSTART, dragFunc);
      this.dragHandle_.classList.remove('locked');
    }
  }

  /**
   * Lock the component in place.
   * Removes all the listeners added when it was made draggable.
   */
  lock() {
    this.stopListeningTo(this.dragHandle_, EV.MOUSEDOWN);
    this.stopListeningTo(this.dragHandle_, EV.TOUCHSTART);
    this.isLocked_ = true;
    this.dragHandle_.classList.add('locked');
  }
}


export default Dragger;