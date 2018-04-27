import Component from './component.js';
import Dragger from './dragger.js';
import {UiEventType} from '../events/uieventtype.js';
import {
  isNumber,
  randomId,
  isDefAndNotNull,
  maybeFunc,
} from '../../node_modules/badu/module/badu.mjs';
import {randomColour,} from '../dom/utils.js';
import {EV,} from '../events/mouseandtouchevents.js';




//--------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {!Function} setW
 * @param {!Function} setH
 * @param {!Function} addC
 * @param {number|undefined}width
 * @param {Array<string>} classArr
 * @return {HTMLElement}
 */
const makeNestEl = (setW, setH, addC, width, classArr) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'relative';
  // el.style.backgroundColor = randomColour();
  if (isDefAndNotNull(width)) {
    el.style.flexBasis = width + 'px';
  } else {
    el.style.flexGrow = '1';
    setW(el, 0);
  }
  setH(el, 'auto', '');
  addC(el);
  classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {function(!HTMLElement, number, string=): void} setW
 * @param {function(!HTMLElement, number, string=): void} setH
 * @param {function(!HTMLElement): void} addC
 * @param {number} thickness
 * @param {Array<string>} classArr
 * @return {function(): !HTMLElement}
 */
const makeDraggerEl = (setW, setH, addC, thickness, classArr) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addC(el);
  classArr.forEach(e => el.classList.add(e));
  setH(el, 100, '%');
  setW(el, thickness);

  // Append an inner grabber.
  const grabber = document.createElement('div');
  grabber.classList.add('grabber');
  addC(grabber);
  el.appendChild(grabber);
  return el;
};


//----------------------------------------------------------[ Event Handlers ]--
const onDraggerEvent = e => {
  const data = e.detail.getData();
  const model = data.component.model;
  switch (e.detail.getValue()) {

    case UiEventType.COMP_DRAG_START:
      // Store a reference to the other nest's current size.
      // We monitor this to detect collisions.
      model.preCollisionOtherSize = model.otherNestSize();
      model.preCollisionOtherOffset = model.otherOffset();
      model.ownDraggerEl.style.zIndex = 1;
      model.otherDraggerEl.style.zIndex = 0;
      model.unClose();
      break;

    case UiEventType.COMP_DRAG_MOVE:
      model.doDrag();
      if (model.collision()) {
        if (!model.colliding) {
          // We entered the colliding state.
          // Take a reference of this position.
          model.onCollisionOwnSize = model.nestSize();
          model.onCollisionOwnOffset = model.ownOffset();
        }
        model.colliding = true;

        // From this point on the drag "feels" elastic.
        model.matchOtherToNest();
        model.otherDragger.model.matchOtherToNest();
      } else {
        if (model.colliding) {
          // We were colliding, but not any more...
          model.matchOtherToNest();
        }
        model.colliding = false;
      }
      break;

    case UiEventType.COMP_DRAG_END:

      if (model.colliding) {
        resizeNest_(
            model.onCollisionOwnOffset,
            model.onCollisionOwnSize,
            data.component,
            false,
            () => {
              model.colliding = false;
              model.preCollisionOtherSize = void 0;
              model.preCollisionOtherOffset = void 0;
              model.onCollisionOwnSize = void 0;
              model.onCollisionOwnOffset = void 0;
              model.otherDragger.model.matchOtherToNest();
            });
        resizeNest_(
            model.preCollisionOtherOffset,
            model.preCollisionOtherSize,
            model.otherDragger,
            false,
            () => {
              model.matchOtherToNest();
            });
      } else {
        // This is the same as match self to nest...
        model.otherDragger.model.matchOtherToNest();
      }
      break;
    default:
      // Do nothing.
  }
};

const onDoubleClick = component => e => {
  component.model.toggle();
};


//-----------------------------------------------------[ Orientation Helpers ]--
/**
 * @param {string} orient
 * @return {function(!HTMLElement): number}
 */
const orientGetElWidth = orient => {
  if (orient === 'EW') {
    return el => el.getBoundingClientRect().width;
  } else {
    return el => el.getBoundingClientRect().height;
  }
};

/**
 * @param {string} orient
 * @return {function(!HTMLElement): number}
 */
const orientGetElOffset = orient => {
  if (orient === 'EW') {
    return el => el.offsetLeft;
  } else {
    return el => el.offsetTop;
  }
};

/**
 * @param {string} orient
 * @return {function(!HTMLElement, number|string, string=): void}
 */
const orientSetElWidth = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) => {
      el.style.width = `${num}${op_unit ? op_unit : 'px'}`
    };
  } else {
    return (el, num, op_unit) => {
      el.style.height = `${num}${op_unit ? op_unit : 'px'}`
    };
  }
};

/**
 * @param {string} orient
 * @return {function(!HTMLElement, number|string, string=): void}
 */
const orientSetElHeight = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) => {
      el.style.height = `${num}${op_unit ? op_unit : 'px'}`
    };
  } else {
    return (el, num, op_unit) => {
      el.style.width = `${num}${op_unit ? op_unit : 'px'}`
    };
  }
};

/**
 * @param orient
 * @return {function(!HTMLElement, number|string, string=): void}
 */
const orientSetElOffset = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) => {
      el.style.left = `${num}${op_unit ? op_unit : 'px'}`
    };
  } else {
    return (el, num, op_unit) => {
      el.style.top = `${num}${op_unit ? op_unit : 'px'}`
    };
  }
};

/**
 * @param {string} orient
 * @return {function(HTMLElement): void}
 */
const orientAddOrientClass = orient => {
  if (orient === 'EW') {
    return el => el.classList.add('east-west');
  } else {
    return el => el.classList.add('north-south');
  }
};


/**
 * @param {number} drgOffset Final required position of the dragger
 * @param {number} nestFlexBasis Final required size of the nest
 * @param {Dragger} dragger
 * @param {boolean} isClose True if this is a full close. In those cases we
 *    want to add a class to the nest and dragger to allow closed styling.
 * @param {Function|undefined} opt_onDoneFunc Callback when the resize completed.
 *    This only fires after the transition animation (if any) is done.
 * @param {boolean=} opt_skipTrans True if the transition should be skipped,
 *    and the move done immediately.
 * @private
 */
const resizeNest_ = (drgOffset, nestFlexBasis, dragger, isClose,
                     opt_onDoneFunc, opt_skipTrans) => {

  const model = dragger.model;
  const context = model.context;
  const orientString = model.orient === 'EW' ? 'left' : 'top';
  const drgEl = model.ownDraggerEl;
  const nestEl = model.ownNest;
  const ms = 250;

  // Just set the values. No transitions, no checking of current values.
  if (opt_skipTrans) {
    model.setOwnOffset(drgOffset);
    nestEl.style.flexBasis = `${nestFlexBasis}px`;
    isClose
        ? nestEl.classList.add('closed')
        : nestEl.classList.remove('closed');
    maybeFunc(opt_onDoneFunc)();
  } else {

    let timeoutID;
    const onTransitionEnd = () => {
      context.stopListeningTo(drgEl, EV.TRANSITIONEND);
      context.stopListeningTo(nestEl, EV.TRANSITIONEND);
      drgEl.style.transition = null;
      nestEl.style.transition = null;
      if (isClose) {
        drgEl.classList.add('closed');
        nestEl.classList.add('closed');
      }
      context.refreshAll_();
      maybeFunc(opt_onDoneFunc)();
      window.clearTimeout(timeoutID);
    };

    // Don't even begin this unless we have to.
    // Else you will leak events, as the transition will never start,
    // and thus never end.
    if (model.ownOffset() !== drgOffset) {
      context.listen(drgEl, EV.TRANSITIONEND, onTransitionEnd);
    }

    // A hard stop to make sure we fire what needs to be fired.
    // Will be canceled if the transition end fired before this.
    timeoutID = window.setTimeout(onTransitionEnd, ms + 50);

    drgEl.style.transition = `${orientString} ${ms}ms ease-in-out`;
    nestEl.style.transition = `flex-basis ${ms}ms ease-in-out`;
    nestEl.style.flexBasis = `${nestFlexBasis}px`;
    model.setOwnOffset(drgOffset);
    if (!isClose) {
      nestEl.classList.remove('closed');
      drgEl.classList.remove('closed');
    }
  }

};


//--------------------------------------------------------------[ Main Class ]--
export default class Split extends Component {

  constructor(opt_thickness) {
    super();

    /**
     * The global dragger thickness.
     * @type {number}
     * @private
     */
    this.thickness_ = isNumber(opt_thickness) ? opt_thickness : 12;

    /**
     * Pre-calculated half-width of the draggers
     * @type {number}
     * @private
     */
    this.halfThick_ = this.thickness_ / 2;

    /**
     * Holds reference between the nest designation, and the nest element.
     * @type {Map<string, !HTMLElement>}
     * @private
     */
    this.nestMap_ = new Map();

    /**
     * @type {Set<Function>}
     * @private
     */
    this.refreshFuncs_ = new Set();

    /**
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {Set<!HTMLElement>}
     * @private
     */
    this.splitNests_ = new Set();

    /**
     * Map of nest names to methods that move them.
     * @type {Map<string, Function>}
     * @private
     */
    this.resizeFuncs_ = new Map();

    /**
     * Map of nest names to methods that close them.
     * @type {Map<string, Function>}
     * @private
     */
    this.closeFuncs_ = new Map();

    /**
     * Map of nest names to the dragger components that affect them.
     * The value of the map is a two-element array. The first element is a
     * string, denoting the orientation ('EW', 'NS') and the second is the
     * actual dragger component.
     * @type {Map<string, Array<string|!Dragger>>}
     * @private
     */
    this.draggerMap_ = new Map();

    window.addEventListener('resize', () => this.refreshAll_());
  };

  get nests() {
    return [...this.nestMap_.values()].filter(e => !this.splitNests_.has(e))
  }

  get draggers() {
    return [...this.draggerMap_.values()].map(e => e[1]);
  }

  get NSdraggers() {
    return [...this.draggerMap_.values()]
        .filter(([a,]) => a === 'NS')
        .map(([a, b]) => b);
  }

  /**
   * When the window size changes, refresh the layout.
   * @private
   */
  refreshAll_() {
    for (const f of this.refreshFuncs_) {
      f();
    }
  };

  /**
   * @param s
   * @return {!HTMLElement | undefined}
   */
  getNest(s) {
    return this.nestMap_.get(s);
  }

  /**
   * Resize a nest.
   * @param {string} s Nest name
   * @param {number} size The required size of the resulting move.
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  resize(s, size, func, opt_skipAni = false) {
    if (this.resizeFuncs_.has(s)) {
      this.resizeFuncs_.get(s)(size, func, opt_skipAni);
    }
  }

  /**
   * Open an closed and locked nest. Simply a convenience method to combine
   * the unlock and resize steps.
   * @param {string} s Nest name
   * @param {number} size The required size of the resulting move.
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  openAndUnlock(s, size, func, opt_skipAni = false) {
    if (this.resizeFuncs_.has(s)) {
      this.resizeFuncs_.get(s)(
          () => {
            this.unlock(s);
            maybeFunc(func)
          }, opt_skipAni);
    }
  }

  /**
   * Close nest. Move it out the way. Once done a 'closed' class is added
   * to the nest and dragger.
   * @param {string} s Nest name
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  close(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(func, opt_skipAni);
    }
  }

  /**
   * Close the nest and lock it. See <@code>lock</>
   * @param {string} s Nest name
   * @param {Function|undefined} func A callback function to call once
   *    the resize completed.
   * @param {boolean?} opt_skipAni When true, the resize won't be animated, but
   *    simply affected directly.
   */
  closeAndLock(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(
          () => {
            this.lock(s);
            maybeFunc(func)
          }, opt_skipAni);
    }
  }

  /**
   * Lock a dragger. Removes the listeners that make it draggable.
   * Adds the 'locked' class to the element.
   * Sets the element's "display" style to none.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} s Nest name
   */
  lock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].lock();
    }
  }

  /**
   * The reverse of a lock. Removes the classes added by <@code>lock</> and
   * restores the draggable listeners.
   * Even though all these operations are performed on the the dragger, access
   * is vai the nest name - for consistency with the rest of the API.
   * @param {string} s Nest name
   */
  unlock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].unlock();
    }
  }

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
   * @param {HTMLElement=} opt_el The element to split. If not given, the
   *    components own element is used. Else, the element is checked to be
   *    a member of this split-group, and if so, is split.
   * @param {string=} orientation Only 'EW' or 'NS'. Defaults to 'EW'
   * @param {Array<number>} limitsA Width of the A nest
   * @param {Array<number>} limitsC Width of the C nest
   */
  addSplit(opt_el = void 0, orientation = 'EW', limitsA = [], limitsC = []) {

    // Sanitize input
    // Clean the orientation.
    const orient = ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    let root = opt_el ? opt_el : this.getElement();
    let refN = '';
    if (opt_el) {
      const match = [...this.nestMap_.entries()].find(([k, v]) => v === opt_el);
      if (match) {
        refN = match[0];
        root = match[1];
      } else {
        return ['Element not managed by this component', opt_el];
      }
    }
    if (this.splitNests_.has(root)) {
      return ['Already used!', root];
    }

    // Make sure the container is flexing.
    root.style.display = 'flex';
    root.style.flexDirection = orient === 'EW' ? 'row' : 'column';
    root.style.overflow = 'hidden';
    root.style.padding = '0';

    // Prep all the orientation helper functions. This reduces the need to
    // further try and keep track of the orientation. From here on we
    // can think in terms of a "EW" layout, and these function will
    // take care of the translation into "NS" or "EW" as needed.
    const getW = orientGetElWidth(orient);
    const getO = orientGetElOffset(orient);
    const setW = orientSetElWidth(orient);
    const setH = orientSetElHeight(orient);
    const setO = orientSetElOffset(orient);
    const addC = orientAddOrientClass(orient);
    const nullFunc = () => null;

    // Dragger thickness.
    const thickness = this.thickness_;
    const hT = this.halfThick_;

    // Nest names.
    const refA = `${refN}A`;
    const refB = `${refN}B`;
    const refC = `${refN}C`;

    // Nest Default size and limits.
    const defSizeA = limitsA[0] || getW(root) / 3;
    const minSizeA = limitsA[1] || 0;
    const maxSizeA = limitsA[2];
    const defSizeC = limitsC[0] || getW(root) / 3;
    const minSizeC = limitsC[1] || 0;
    const maxSizeC = limitsC[2];

    // Make the nest elements
    const a = makeNestEl(setW, setH, addC, defSizeA, ['_A', refA]);
    const b = makeNestEl(setW, setH, addC, void 0, ['_B', refB]);
    const c = makeNestEl(setW, setH, addC, defSizeC, ['_C', refC]);
    [a, b, c].forEach(e => root.appendChild(e));

    // Make the dragger components
    const freedom = orient === 'EW' ? 'x' : 'y';
    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(setW, setH, addC, thickness, ['__A']);
    AB.render(root);
    const ab = AB.getElement();

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(setW, setH, addC, thickness, ['__C']);
    BC.render(root);
    const bc = BC.getElement();

    // Once rendered, the dragger can be matched the their nests.
    const matchDraggersToNest = () => {
      const aW = getW(a);
      setO(ab, aW - hT);
      setO(bc, aW + getW(b) - hT)
    };
    matchDraggersToNest();

    // Extend the dragger's model with the required info about this setup
    // to be able to do everything it needs functionally.
    AB.model = {
      context: this,
      orient,
      hT,
      defaultSize: defSizeA,
      maxSize: minSizeA,
      minSize: maxSizeA,
      root,
      ownNest: a,
      ownDraggerEl: ab,
      midNest: b,
      otherNest: c,
      otherDraggerEl: bc,
      otherDragger: BC,
      doDrag: () => a.style.flexBasis = getO(ab) + hT + 'px',
      unClose: () => a.classList.remove('closed'),
      matchOtherToNest: () => setO(bc, getW(a) + getW(b) - hT),
      ownOffset: () => getO(ab),
      nestOffset: () => getO(a),
      nestSize: () => getW(a),
      setOwnOffset: n => setO(ab, n),
      rootSize: () => getW(root),
      otherNestSize: () => getW(c),
      otherOffset: () => getO(bc),
      mustOpen: () => getO(ab) <= Math.max(30, minSizeA),
      collision: () => AB.model.preCollisionOtherSize > BC.model.nestSize(),
      toggle: () => AB.model.mustOpen() ? AB.model.resize() : AB.model.close(),
      resize: (value = defSizeA, opt_aF = nullFunc, opt_skipTrans = false) => {
        resizeNest_(value, value, AB, false, opt_aF, opt_skipTrans)
      },
      close: (opt_aF = nullFunc, opt_Trans = false) => {
        resizeNest_(0, 0, AB, true, opt_aF, opt_Trans);
      }
    };

    BC.model = {
      context: this,
      orient,
      hT,
      defaultSize: defSizeC,
      maxSize: minSizeC,
      minSize: maxSizeC,
      root,
      ownNest: c,
      ownDraggerEl: bc,
      midNest: b,
      otherNest: a,
      otherDraggerEl: ab,
      otherDragger: AB,
      doDrag: () => c.style.flexBasis = getW(root) - getO(bc) - hT + 'px',
      unClose: () => c.classList.remove('closed'),
      matchOtherToNest: () => setO(ab, getW(a) - hT),
      ownOffset: () => getO(bc),
      nestOffset: () => getO(c),
      nestSize: () => getW(c),
      setOwnOffset: n => setO(bc, n),
      rootSize: () => getW(root),
      otherNestSize: () => getW(a),
      otherOffset: () => getO(ab),
      mustOpen: () => (getW(root) - getO(bc)) <= Math.max(30, minSizeC),
      collision: () => BC.model.preCollisionOtherSize > AB.model.nestSize(),
      toggle: () => BC.model.mustOpen() ? BC.model.resize() : BC.model.close(),
      resize: (value = defSizeC, opt_aF = nullFunc,
               opt_skipTrans = false) => {
        resizeNest_(getW(root) - value, value, BC, false, opt_aF, opt_skipTrans);
      },
      close: (opt_aF = nullFunc, opt_skipTrans = false) => {
        resizeNest_(getW(root), 0, BC, true, opt_aF, opt_skipTrans);
      }
    };


    this.listen(AB, Component.compEventCode(), onDraggerEvent);
    this.listen(BC, Component.compEventCode(), onDraggerEvent);
    this.listen(ab, EV.DBLCLICK, onDoubleClick(AB));
    this.listen(bc, EV.DBLCLICK, onDoubleClick(BC));

    // Make these things listen
    [...this.draggerMap_.values()]
        .filter(e => e[0] === orient)
        .map(e => e[1])
        .forEach(e => {
          this.listen(e, Component.compEventCode(), matchDraggersToNest)
        });

    // Park the split so the component getters and setters can get to it.
    this.refreshFuncs_.add(matchDraggersToNest);
    this.draggerMap_.set(refA, [orient, AB]).set(refC, [orient, BC]);
    this.nestMap_.set(refA, a).set(refB, b).set(refC, c);
    this.splitNests_.add(root);
    this.resizeFuncs_
        .set(refA, AB.model.resize)
        .set(refC, BC.model.resize);
    this.closeFuncs_
        .set(refA, AB.model.close)
        .set(refC, BC.model.close);
  }

}
