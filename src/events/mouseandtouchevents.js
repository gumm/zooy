// noinspection SpellCheckingInspection
/**
 * @enum {string}
 */
export const EV = {
  // Mouse events
  CLICK: 'click',
  RIGHTCLICK: 'rightclick',
  DBLCLICK: 'dblclick',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',
  MOUSEENTER: 'mouseenter',
  MOUSELEAVE: 'mouseleave',

  // Touch events
  // Note that other touch events exist, but we should follow the W3C list here.
  // http://www.w3.org/TR/touch-events/#list-of-touchevent-types
  TOUCHSTART: 'touchstart',
  TOUCHMOVE: 'touchmove',
  TOUCHEND: 'touchend',
  TOUCHCANCEL: 'touchcancel',

  // Transitions
  TRANSITIONEND: 'transitionend',

  // Animations
  ANIMATIONEND: 'animationend'
};

/**
 * @type {Array<string>}
 */
const touchEvents = [EV.TOUCHMOVE, EV.TOUCHSTART, EV.TOUCHEND];

/**
 * @param {Event} ev
 * @return {boolean}
 */
export const isTouchEvent = ev => touchEvents.includes(ev.type);

/**
 * Given a touch event, just add the clientX and clientY values where
 * they are on mouse event.
 * @param {MouseEvent|TouchEvent} ev
 * @return {Event}
 */
export const normalizeEvent = ev => {
  if (isTouchEvent(ev)) {
    ev.clientX = ev.targetTouches[0].clientX;
    ev.clientY = ev.targetTouches[0].clientY;
  }
  return ev;
};
