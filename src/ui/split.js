import Component from './component.js';
import {UiEventType} from '../events/uieventtype.js';
import {identity, randomId} from 'badu';
import EVT from './evt.js';
import Dragger from './dragger.js';
import ZooyEventData from '../events/zooyeventdata.js';
import {EV} from '../events/mouseandtouchevents.js';


//--------------------------------------------------------------[ Main Class ]--
/**
 * A Split component divides an element into resizable sections ("nests") separated
 * by draggable dividers. Supports horizontal (EW) and vertical (NS) splits, nested
 * splitting, and programmatic control of nest sizes and states. Each nest can be
 * opened, closed, locked, or unlocked with optional animation.
 *
 * @extends {Component}
 */
export default class Split extends Component {

  /**
   * Returns the split event type code used for dispatching split events.
   * @return {string} The SPLIT event type
   */
  static splitEventCode() {
    return UiEventType.SPLIT;
  }

  /**
   * Creates a new Split component instance. Initializes nest tracking and
   * callback management.
   */
  constructor() {
    super();

    this.dragImage_ = document.createElement('canvas');

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

  /**
   * Returns all nest entries (name and config object) that have a valid element.
   * @return {!Array<!Array<string, !Object>>} Array of [nestName, nestConfig] pairs
   */
  get nests() {
    return [...this.nestMap_.entries()].filter(([k, {nestEl}]) => nestEl);
  }

  /**
   * Gets the nest element for a given nest name.
   * @param {string} nestName The nest name to look up
   * @return {!Element | undefined} The nest element, or undefined if not found
   */
  getNest(nestName) {
    return this.nestMap_.get(nestName)?.nestEl;
  }

  /**
   * Returns the names of all nests that haven't been further split.
   * @return {!Array<string>} Array of nest names
   */
  get nestNames() {
    return [...this.nestMap_.entries()]
      .filter(([k, v]) => !this.splitNests_.has(v))
      .map(([k]) => k);
  }

  /**
   * Closes and locks all nests in this split component.
   * @param {!Function=} callback Callback to execute after each nest closes
   * @param {boolean=} opt_skipAni If true, skips animation
   */
  closeAndLockAll(callback = identity, opt_skipAni = false) {
    this.nestNames.forEach(n => this.closeAndLock(n, callback, opt_skipAni));
  }

  /**
   * Opens and unlocks all nests in this split component.
   * @param {!Function=} callback Callback to execute after each nest opens
   * @param {boolean=} opt_skipAni If true, skips animation
   */
  openAndUnlockAll(callback = identity, opt_skipAni = false) {
    this.nestNames.forEach(n => this.openAndUnlock(n, callback, opt_skipAni));
  }

  // ---------------------------------------------------------------------------
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
   */
  resize(nestName, size, callback = identity, opt_skipAni = false) {
    const {sizeNow, nestEl, canResize} = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    if (opt_skipAni || sizeNow === size) {
      nestEl.classList.remove('animated');
      nestEl.style.flexBasis = `${size}px`;
      this.nestMap_.get(nestName).sizeNow = size;
      callback();
    } else {
      nestEl.classList.add('animated');
      this.nestCallbackMap_.set(nestName, () => {
        // We always leave the nest without animations, as this makes for
        // a more responsive drag behavior.
        nestEl.classList.remove('animated');
        this.nestMap_.get(nestName).sizeNow = size;
        callback();
      });
      nestEl.style.flexBasis = `${size}px`;
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
    const {nestEl, dragEl, canResize} = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    const onDone = () => {
      dragEl.classList.add('locked', 'closed');
      nestEl.classList.add('closed');
      callback();
    };
    this.resize(nestName, 0, onDone, opt_skipAni);
  }

  closeAndUnlock(nestName, callback = identity, opt_skipAni = false) {
    const {nestEl, dragEl, canResize} = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    const onDone = () => {
      nestEl.classList.remove('closed');
      dragEl.classList.remove('closed', 'locked');
      dragEl.classList.add('collapsed');
      callback();
    };
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
    const {
      nestEl,
      dragEl,
      defSize,
      lastSize,
      canResize
    } = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    const targetSize = size || lastSize || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed', 'locked', 'collapsed');
    setTimeout(() => {
      this.resize(nestName, targetSize, callback, opt_skipAni);
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
    const {
      nestEl,
      dragEl,
      defSize,
      lastSize,
      canResize
    } = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    const targetSize = size || lastSize || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed', 'collapsed');
    setTimeout(() => {
      this.resize(nestName, targetSize, callback, opt_skipAni);
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
    const {dragEl, canResize, nestEl} = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    this.dispatchSplitEvent(UiEventType.SPLIT_WILL_CLOSE, {nestName, nestEl});
    const cb = () => {
      dragEl.classList.add('collapsed');
      this.dispatchSplitEvent(UiEventType.SPLIT_DID_CLOSE, {nestName, nestEl});
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
  open(nestName, callback = identity, opt_skipAni = false) {
    const {defSize, lastSize, dragEl, canResize, nestEl} = this.nestMap_.get(nestName);
    if (!canResize) {
      return;
    }
    this.dispatchSplitEvent(UiEventType.SPLIT_WILL_OPEN, {nestName, nestEl});
    dragEl.classList.remove('collapsed', 'closed');
    const targetSize = lastSize || defSize;
    const cb = () => {
      this.dispatchSplitEvent(UiEventType.SPLIT_DID_OPEN, {nestName, nestEl});
      callback();
    };
    this.resize(nestName, targetSize, cb, opt_skipAni);
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
    if (this.nestMap_.get(nestName).sizeNow === 0) {
      this.open(nestName, callback, opt_skipAni);
    } else {
      this.close(nestName, callback, opt_skipAni);
    }
  }


  //----------------------------------------------------------------------------
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
    classArrGrabber = []) {

    // Check that we are not splitting the same root element twice.
    const root = opt_el ? opt_el : this.getElement();
    if (this.splitNests_.has(root)) {
      return ['Already used!', root];
    } else {
      convertElToSplit(root, orientation);
      this.splitNests_.add(root);
    }

    // Check we are splitting a element that is part of the component.
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
    AB.domFunc = makeDraggerEl([`zoo_drag_${refA}`,...classArrDragger], classArrGrabber);
    AB.render(root);
    this.nestMap_.set(refA, {
      side: 'A',
      nestEl: A,
      dragger: AB,
      dragEl: AB.getElement(),
      defSize: defSizeA,
      sizeNow: -1,
      canResize: true
    });

    // Middle nests don't have associated daggers
    const refB = `${refN}B`;
    const B = makeInnerNest([...['zoo_nest__B', refB], ...classArrB]);
    this.nestMap_.set(refB, {nestEl: B, canResize: false});

    // Outer nest and its dragger
    const refC = `${refN}C`;
    const BC = new Dragger(orientation);
    BC.domFunc = makeDraggerEl([`zoo_drag_${refC}`,...classArrDragger], classArrGrabber);
    BC.render(root);
    const C = makeOuterNest(defSizeC, [...['zoo_nest__C', refC], ...classArrC]);
    this.nestMap_.set(refC, {
      side: 'C',
      nestEl: C,
      dragger: BC,
      dragEl: BC.getElement(),
      defSize: defSizeC,
      sizeNow: -1,
      canResize: true
    });

    [A, AB.getElement(), B, BC.getElement(), C].forEach(e => root.appendChild(e));

    let maxSize = 0;
    const onDragEvent = (orientation, nest, ref, factor) => {
      let start;
      const metric = orientation === 'NS' ? 'height' : 'width';
      const delta = orientation === 'NS' ? 'deltaY' : 'deltaX';
      return event => {
        switch (event.detail.value_) {
          case UiEventType.COMP_DRAG_START:
            // Calculate the maximum move possible.
            start = nest.getBoundingClientRect()[metric];
            maxSize = B.getBoundingClientRect()[metric] + start;
            this.nestMap_.get(ref).dragEl.classList.remove('collapsed');
            break;
          case UiEventType.COMP_DRAG_MOVE: {
            const val = Math.min(maxSize, start + factor * event.detail.data_[delta]);
            this.nestMap_.get(ref).lastSize = val;
            nest.style.flexBasis = val + 'px';
            break;
          }
          case UiEventType.COMP_DRAG_END:
            // We do nothing here. Be careful, this fires even if no drag took place.
            this.dispatchSplitEvent(UiEventType.COMP_DRAG_END, this.nestMap_.get(ref));
            break;
          default:
            break;
        }
      };
    };

    this.listen(AB, Component.compEventCode(), onDragEvent(orientation, A, refA, 1));
    this.listen(BC, Component.compEventCode(), onDragEvent(orientation, C, refC, -1));
    this.listen(AB.getElement(), EV.DBLCLICK, () => this.toggle(refA));
    this.listen(BC.getElement(), EV.DBLCLICK, () => this.toggle(refC));
    this.listen(AB.getElement().querySelector('.zoo_grabber'), EV.CLICK, () => this.toggle(refA));
    this.listen(BC.getElement().querySelector('.zoo_grabber'), EV.CLICK, () => this.toggle(refC));

    this.listen(A, EV.TRANSITIONEND, (event) => {
      if (event.propertyName === 'flex-basis' && event.target === A) {
        const callback = this.nestCallbackMap_.get(refA);
        this.nestCallbackMap_.delete(refA);
        callback && callback();
        this.dispatchSplitEvent(UiEventType.SPLIT_TRANSITION_END, this.nestMap_.get(refA));
      }
    });
    this.listen(C, EV.TRANSITIONEND, (event) => {
      if (event.propertyName === 'flex-basis' && event.target === C) {
        const callback = this.nestCallbackMap_.get(refC);
        this.nestCallbackMap_.delete(refC);
        callback && callback();
        this.dispatchSplitEvent(UiEventType.SPLIT_TRANSITION_END, this.nestMap_.get(refC));
      }
    });
  }

  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.SPLIT} event.
   * Views may listen just to this event, and act on the supplied value or
   * data payload.
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

//--------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {!Element} el
 * @param {!string} orientation
 * @return {!Element}
 */
const convertElToSplit = (el, orientation) => {
  el.classList.add('zoo_split', `zoo_split__${orientation.toLowerCase()}`);
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
  el.classList.add('zoo_nest', 'zoo_nest__outer', ...classArr);
  el.style.flexBasis = initialSize + 'px';
  // classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {?Array<!string>} classArr
 * @return {!Element}
 */
const makeInnerNest = (classArr = []) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('zoo_nest', 'zoo_nest__inner', ...classArr);
  // el.classList.add();
  // classArr.forEach(e => el.classList.add(e));
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
  el.classList.add('zoo_dragger', ...classArrDragger);
  // classArrDragger.forEach(e => el.classList.add(e));

  // Append an inner grabber.
  const grabber = document.createElement('div');
  grabber.classList.add('zoo_grabber', ...classArrGrabber);
  // classArrGrabber.forEach(e => grabber.classList.add(e));
  el.appendChild(grabber);
  return el;
};
