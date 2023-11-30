import Component from './component.js';
import {UiEventType} from '../events/uieventtype.js';
import {
  identity, randomId,
} from 'badu';
import EVT from "./evt.js";
import Dragger from './dragger.js';
import ZooyEventData from "../events/zooyeventdata.js";
import {EV} from "../events/mouseandtouchevents.js";


//--------------------------------------------------------------[ Main Class ]--
export default class Split_2 extends Component {

  static splitEventCode() {
    return UiEventType.SPLIT;
  }

  constructor() {
    super();

    this.dragImage_ = document.createElement("canvas");

    /**
     * Holds reference between the nest designation, and the nest element.
     * @type {!Map<string, !Object>}
     * @private
     */
    this.nestMap_ = new Map();

    this.nestCallbackMap_ = new Map();

    /**
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {!Set<!Element>}
     * @private
     */
    this.splitNests_ = new Set();

    // window.addEventListener('resize', () => this.refreshAll_());
  };

  get nests() {
    return [...this.nestMap_.entries()].filter(([k, {nestEl}]) => nestEl);
  }

  /**
   * @param nestName
   * @return {!Element | undefined}
   */
  getNest(nestName) {
    return this.nestMap_.get(nestName)?.nestEl;
  }

  // -----------------------------------------------------------------------------------
  /**
   * Lock a dragger. Removes the listeners that make it draggable.
   * Adds the 'locked' class to the element.
   * Sets the element's "display" style to none.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} nestName Nest name
   */
  lock(nestName) {
    const {dragEl} = this.nestMap_.get(nestName);
    dragEl.classList.add('locked');
  }

  /**
   * The reverse of a lock. Removes the classes added by <@code>lock</> and
   * restores the draggable listeners.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} nestName Nest name
   */
  unlock(nestName) {
    const {dragEl} = this.nestMap_.get(nestName);
    dragEl.classList.remove('locked');
  }

  /**
   * Resize a nest.
   * @param {string} nestName Nest name
   * @param {number} size The required size of the resulting move.
   * @param {Function?} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   * TODO: There is a bug here when we resize a nest that is already on it's size,
   *    then the callback never gets called if the skip_ani flag is false (the default)
   *    That is why there is the 100ms timeout on setting the flex basis.
   */
  resize(nestName, size, callback = identity, opt_skipAni = false) {
    const {nestEl} = this.nestMap_.get(nestName);
    this.nestMap_.get(nestName).isClosed = size <= 0;

    if (opt_skipAni) {
      nestEl.classList.remove('animated');
      nestEl.style.flexBasis = `${size}px`;
      callback();
    } else {
      this.nestCallbackMap_.set(nestName, () => {
        nestEl.classList.remove('animated');
        callback();
      });
      nestEl.classList.add('animated');

      // TODO: Workaround for race.
      setTimeout(() => {
        nestEl.style.flexBasis = `${size}px`;
      }, 100);

    }
  }

  /**
   * Close the nest and lock it. See <@code>lock</>
   * @param {string} nestName Nest name
   * @param {Function?} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  closeAndLock(nestName, callback = identity, opt_skipAni = false) {
    const {nestEl, dragEl} = this.nestMap_.get(nestName);
    const onDone = () => {
      dragEl.classList.add('locked');
      dragEl.classList.add('closed');
      nestEl.classList.add('closed');
      callback();
    }
    this.resize(nestName, 0, onDone, opt_skipAni);
  }

  /**
   * Open a closed and locked nest. Simply a convenience method to combine
   * the unlock and resize steps.
   * @param {string} nestName Nest name
   * @param {number?} size The required size of the resulting move.
   * @param {Function?} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  openAndUnlock(nestName, size, callback, opt_skipAni = false) {
    const {nestEl, dragEl, defSize, lastSize} = this.nestMap_.get(nestName);
    const targetSize = size || lastSize || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed');
    dragEl.classList.remove('locked');
    dragEl.classList.remove('collapsed');
    setTimeout(() => {
      this.resize(nestName, targetSize, callback, opt_skipAni)
    }, 50);
  }

  /**
   * Open a closed and locked nest. Keep the nest locked.
   * @param {string} nestName Nest name
   * @param {number?} size The required size of the resulting move.
   * @param {Function?} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  openAndLock(nestName, size, callback, opt_skipAni = false) {
    const {nestEl, dragEl, defSize, lastSize} = this.nestMap_.get(nestName);
    const targetSize = size || lastSize || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed');
    dragEl.classList.remove('collapsed');
    setTimeout(() => {
      this.resize(nestName, targetSize, callback, opt_skipAni)
    }, 50);
  }

  /**
   * Close nest. Move it out the way, but continue to make it draggable;
   * to the nest and dragger.
   * @param {string} nestName Nest name
   * @param {Function|undefined} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  close(nestName, callback = identity, opt_skipAni = false) {
    const {dragEl} = this.nestMap_.get(nestName);
    const cb = () => {
      dragEl.classList.add('collapsed');
      callback();
    };
    this.resize(nestName, 0, cb, opt_skipAni);
  }

  /**
   * Open the nest ignoring its current locked state.
   * @param {string} nestName Nest name
   * @param {Function|undefined} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  open(nestName, callback, opt_skipAni = false) {
    const {defSize, lastSize, dragEl} = this.nestMap_.get(nestName);
    dragEl.classList.remove('collapsed');
    dragEl.classList.remove('closed');
    const targetSize = lastSize || defSize;
    this.resize(nestName, targetSize, callback, opt_skipAni);
  }

  /**
   * Close the nest ignoring its current locked state.
   * @param {string} nestName Nest name
   * @param {Function|undefined} callback A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  toggle(nestName, callback, opt_skipAni = false) {
    if (this.nestMap_.get(nestName).isClosed) {
      this.open(nestName, callback, opt_skipAni);
    } else {
      this.close(nestName, callback, opt_skipAni);
    }
  }


  //------------------------------------------------------------------------------------
  /**
   * Split an element into parts, each separated by a dragger component.
   * The split creates 3 new elements inside root element. Thus it is not
   * truly splitting the reference element, but rather overlaying the
   * split functionality over the reference element.
   * A split can be either horizontal - called "EW" (east-west) or
   * vertical - called "NS" (north-south).
   * By convention the new elements created are called 'nests', and are named
   * in order "A", "B" and "C" respectively.
   * For EW splits the we name from left to right:
   *    A B C
   * For NS splits we name from top to bottom:
   *    A
   *    B
   *    C
   * Each newly created nest is a valid root for further splitting.
   * When a nest is split, the resultant nests names are prepended with the
   * name of the root nest that was split.
   * Example: If nest C is split, the resultant nests are named CA, CB, and CC.
   * When one of these (for example CA) is split further, the pattern continues
   * with the resulting nests being CAA, CAB, CAC etc.
   * @param {Element=} opt_el The element to split. If not given, the
   *    components own element is used. Else, the element is checked to be
   *    a member of this split-group, and if so, is split.
   * @param {?string} orientation Only 'EW' or 'NS'. Defaults to 'EW'
   * @param {?number} defSizeA Default size of the 'A' nest.
   * @param {?number} defSizeC Default size of the 'C' nest. The 'B' nest gets the
   *    remainder of the 'A' and 'C' nests, and can not be set directly.
   * @param {?Array<string>} classArrA Extra class names to be added to this nest
   * @param {?Array<string>} classArrB Extra class names to be added to this nest
   * @param {?Array<string>} classArrC Extra class names to be added to this nest
   * @param {?Array<string>} classArrDragger Extra classes for the dragger element
   * @param {?Array<string>} classArrGrabber Extra classes for the grabber element
   */
  addSplit(opt_el = void 0, orientation = 'EW',
           defSizeA = 100,
           defSizeC = 100,
           classArrA = [],
           classArrB = [],
           classArrC = [],
           classArrDragger = [],
           classArrGrabber  = []) {

    // Check that we are not splitting the same root element twice.
    let root = opt_el ? opt_el : this.getElement();
    if (this.splitNests_.has(root)) {
      return ['Already used!', root];
    } else {
      convertElToSplit(root, orientation);
      this.splitNests_.add(root);
    }

    // Check we are slitting a element that is part of the component.
    let refN = '';
    if (opt_el) {
      const match = [...this.nestMap_.entries()].find(([k, {nestEl}]) => nestEl === opt_el);
      if (match) {
        refN = match[0];
      } else {
        return ['Element not managed by this component', opt_el];
      }
    }

    // Make the nest elements
    const refA = `${refN}A`;
    const A = makeOuterNest(defSizeA, [...['zoo_nest__A', refA], ...classArrA]);
    const AB = new Dragger(orientation);
    AB.domFunc = makeDraggerEl(classArrDragger);
    AB.render(root);
    this.nestMap_.set(refA, {
      nestEl: A, dragger: AB, dragEl: AB.getElement(), defSize: defSizeA
    });

    // Middle nests don't have accosted daggers
    const refB = `${refN}B`;
    const B = makeInnerNest([...['zoo_nest__B', refB], ...classArrB]);
    this.nestMap_.set(refB, {nestEl: B});

    // Outer nest and its dragger
    const refC = `${refN}C`;
    const BC = new Dragger(orientation);
    BC.domFunc = makeDraggerEl(classArrDragger, classArrGrabber);
    BC.render(root);
    const C = makeOuterNest(defSizeC, [...['zoo_nest__C', refC], ...classArrC]);
    this.nestMap_.set(refC, {
      nestEl: C, dragger: BC, dragEl: BC.getElement(), defSize: defSizeC
    });

    [A, AB.getElement(), B, BC.getElement(), C].forEach(e => root.appendChild(e));

    const onDragEvent = (orientation, nest, ref, factor) => {
      let start;
      const metric = orientation === 'NS' ? 'height' : 'width';
      const delta = orientation === 'NS' ? 'deltaY' : 'deltaX';
      return event => {
        switch (event.detail.value_) {
          case UiEventType.COMP_DRAG_START:
            start = nest.getBoundingClientRect()[metric];
            this.nestMap_.get(ref).dragEl.classList.remove('collapsed');
            break;
          case UiEventType.COMP_DRAG_MOVE:
            const val = start + factor * event.detail.data_[delta];
            this.nestMap_.get(ref).lastSize = val
            nest.style.flexBasis = val + 'px';
            break;
          case UiEventType.COMP_DRAG_END:
            // We do nothing here. Be careful, this fires even if no drag took place.
            this.dispatchSplitEvent(UiEventType.COMP_DRAG_END, this.nestMap_.get(ref));
            break;
          default:
            break;
        }
      }
    }

    this.listen(AB, Component.compEventCode(), onDragEvent(orientation, A, refA, 1));
    this.listen(BC, Component.compEventCode(), onDragEvent(orientation, C, refC, -1));
    this.listen(AB.getElement(), EV.DBLCLICK, () => this.toggle(refA));
    this.listen(BC.getElement(), EV.DBLCLICK, () => this.toggle(refC));

    this.listen(A, EV.TRANSITIONEND, (event) => {
      const callback = this.nestCallbackMap_.get(refA);
      this.nestCallbackMap_.delete(refA);
      callback && callback();
      this.dispatchSplitEvent(UiEventType.SPLIT_TRANSITION_END, this.nestMap_.get(refA));
    });
    this.listen(C, EV.TRANSITIONEND, (event) => {
      const callback = this.nestCallbackMap_.get(refC);
      this.nestCallbackMap_.delete(refC);
      callback && callback();
      this.dispatchSplitEvent(UiEventType.SPLIT_TRANSITION_END, this.nestMap_.get(refC));
    })
  }

  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.VIEW} event.
   * A shorthand method to get panels to dispatch uniform events.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
   * Example:
   *    b.listen(a, Component.compEventCode(), e => {
   *      console.log('B got', Component.compEventCode(), e);
   *      console.log('Value is', e.detail.getValue());
   *      console.log('Data is', e.detail.getData());
   *    });
   * @param {string|number} value
   * @param {(string|number|?Object)=} opt_data
   * @return {boolean} If anyone called preventDefault on the event object (or
   *     if any of the handlers returns false this will also return false.
   */
  dispatchSplitEvent(value, opt_data) {
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.SPLIT, dataObj);
    return this.dispatchEvent(event);
  };

}

//----------------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {!Element} el
 * @param {!string} orientation
 * @return {!Element}
 */
const convertElToSplit = (el, orientation) => {
  el.classList.add('zoo_split');
  el.classList.add(`zoo_split__${orientation.toLowerCase()}`);
  return el;
};

/**
 * @param {!number} initialSize
 * @param {?Array<!string>} classArr
 * @return {!Element}
 */
const makeOuterNest = (initialSize, classArr = []) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('zoo_nest');
  el.classList.add('zoo_nest__outer');
  el.style.flexBasis = initialSize + 'px';
  classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {?Array<!string>} classArr
 * @return {!Element}
 */
const makeInnerNest = (classArr = []) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('zoo_nest');
  el.classList.add('zoo_nest__inner');
  classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {?Array<string>} classArrDragger
 * @param {?Array<string>} classArrGrabber
 * @returns {function(): HTMLDivElement}
 */
const makeDraggerEl = (classArrDragger = [], classArrGrabber = []) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  // el.setAttribute('draggable', true);
  el.classList.add('zoo_dragger');
  classArrDragger.forEach(e => el.classList.add(e));

  // Append an inner grabber.
  const grabber = document.createElement('div');
  grabber.classList.add('zoo_grabber');
  classArrGrabber.forEach(e => grabber.classList.add(e));
  el.appendChild(grabber);
  return el;
};
