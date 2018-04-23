import Component from './component.js';
import { UiEventType } from '../events/uieventtype.js';


// noinspection SpellCheckingInspection
/**
 * @type {{
 *    TOUCHSTART: string,
 *    TOUCHMOVE: string,
 *    TOUCHEND: string,
 *    MOUSEDOWN: string,
 *    MOUSEUP: string,
 *    MOUSEMOVE: string
 * }}
 */
const EV = {
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEMOVE: 'mousemove',
};

const touchEvents = [EV.TOUCHMOVE, EV.TOUCHSTART, EV.TOUCHEND];

const isTouchEvent = ev => touchEvents.includes(ev.type);

const normalizeEvent = ev => {
  if (isTouchEvent(ev)) {
    ev.clientX = ev.targetTouches[0].clientX;
    ev.clientY = ev.targetTouches[0].clientY;
  }
  return ev;
};


/**
 * @param {Element} el
 * @return {Array<number>}
 */
const getPos = el => {
  const style = window.getComputedStyle(el);
  return [style.getPropertyValue('left'), style.getPropertyValue('top')]
      .map(e => e.replace(/[^\d.]/g, ' ')
          .split(' ')
          .filter(e => e !== '')
          .map(e => +e)
      )
      .map(e => e[0]);
};


/**
 * @param {Function} emitter
 * @param {string} degreesOfFreedom
 * @return {Function}
 */
const dragStartListener = (emitter, degreesOfFreedom) => event => {
  const ev = normalizeEvent(event);
  const target = ev.currentTarget;
  const [left, top] = getPos(target);
  const xOrg = ev.clientX - left;
  const yOrg = ev.clientY - top;
  const emit = emitter(left, top, xOrg, yOrg, target);

  let dragFunc = freeMoveListener(emit, target, xOrg, yOrg);
  if (degreesOfFreedom === 'x') {
    dragFunc = xMoveOnlyListener(emit, target, xOrg, yOrg);
  } else if (degreesOfFreedom === 'y') {
    dragFunc = yMoveOnlyListener(emit, target, xOrg, yOrg);
  }

  const cancelFunc = e => {
    console.log('Mouse Up Event');
    document.removeEventListener(EV.MOUSEMOVE, dragFunc, true);
    document.removeEventListener(EV.TOUCHMOVE, dragFunc, true);
    document.removeEventListener(EV.MOUSEUP, cancelFunc, true);
    document.removeEventListener(EV.TOUCHEND, cancelFunc, true);
  };

  document.addEventListener(EV.MOUSEUP, cancelFunc, true);
  document.addEventListener(EV.TOUCHEND, cancelFunc, true);
  document.addEventListener(EV.MOUSEMOVE, dragFunc, true);
  document.addEventListener(EV.TOUCHMOVE, dragFunc, true)
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



class Dragger extends Component {

  constructor(degreesOfFreedom) {
    super();

    /**
     * @type {string}
     * @private
     */
    this.degreesOfFreedom_ = degreesOfFreedom || 'xy';

    /**
     * @type {?Element}
     * @private
     */
    this.dragHandle_ = null;

    /**
     * Track state. A dragger can either be locked (not draggable) or
     * unlocked (draggable).
     * Once unlocked, calling unLock again will not add more listeners.
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
      this.unLock();
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
    this.unLock();
    super.executeBeforeReady();
  }

  //------------------------------------------------------[ Dragger Specific ]--
  makeDragEmitterFunc_() {
    return (left, top, xOrg, yOrg, target) => ev => {
      this.dispatchCompEvent(UiEventType.COMP_DRAGGED, {
        component: this,
        browserEvent: ev,
        clientX: ev.clientX,
        clientY: ev.clientY,
        xOrg: xOrg,
        yOrg: yOrg,
        deltaX: ev.clientX - xOrg - left,
        deltaY: ev.clientY - yOrg - top,
        target: target
      })
    }
  };


  /**
   * Make the component draggable
   */
  unLock() {
    if (this.isInDocument && this.isLocked_) {
      const emitter = this.makeDragEmitterFunc_();
      const dragFunc = dragStartListener(emitter, this.degreesOfFreedom_);
      this.isLocked_ = false;
      this.dragHandle_ = this.dragHandle_ || this.getElement();
      this.listen(this.dragHandle_, EV.MOUSEDOWN, dragFunc);
      this.listen(this.dragHandle_, EV.TOUCHSTART, dragFunc);
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
  }


}


export default Dragger;