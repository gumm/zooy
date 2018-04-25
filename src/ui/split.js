import Component from './component.js';
import Dragger from './dragger.js';
import {UiEventType} from '../events/uieventtype.js';
import {
  isNumber,
  randomId,
  isDefAndNotNull,
} from '../../node_modules/badu/module/badu.mjs';
import {randomColour,} from '../dom/utils.js';
import {EV,} from '../events/mouseandtouchevents.js';

const maybeFunc = func => () => {
  func ? func() : null;
};


//--------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {Function} setW
 * @param {Function} setH
 * @param {Function} addC
 * @param {number|undefined}width
 * @param {Array<string>} classArr
 * @return {HTMLDivElement}
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
 * @param {function(!HTMLDivElement, number, string=):void} setW
 * @param {function(!HTMLDivElement, number, string=):void} setH
 * @param {function(!HTMLDivElement):void} addC
 * @param {number} thickness
 * @return {function(): !HTMLDivElement}
 */
const makeDraggerEl = (setW, setH, addC, thickness) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addC(el);
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
/**
 */
const actOnAB = m => {
  m.ownNest.style.flexBasis = m.ownOffset() + m.hT + 'px';
  m.matchOtherToNest();
};

/**
 */
const actOnBC = m => {
  m.ownNest.style.flexBasis =
      m.rootSize() - m.ownOffset() - m.hT + 'px';
  m.matchOtherToNest();
};

const onDraggerEvent = e => {
  const data = e.detail.getData();
  const model = data.component.model;
  switch (e.detail.getValue()) {
    case UiEventType.COMP_DRAG_MOVE:
      model.onDrag(model);
      model.otherDragger.model.matchOtherToNest();
      break;
    case UiEventType.COMP_DRAG_START:
      model.ownDraggerEl.style.zIndex = 1;
      model.otherDraggerEl.style.zIndex = 0;
      break;
    case UiEventType.COMP_DRAG_END:
      const otherNest = model.otherNest;
      console.log(model.otherDragger.model.nestSize());
      console.log(otherNest.style.flexBasis);
      console.log(otherNest);


      // resizeNest_();
      break;
    default:
      // Do nothing.
  }
};


//-----------------------------------------------------[ Orientation Helpers ]--
/**
 * @param {string} orient
 * @return {function(HTMLDivElement): number}
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
 * @return {function(HTMLDivElement): number}
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
 * @return {function(*, *, *): string}
 */
const orientSetElWidth = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

/**
 * @param {string} orient
 * @return {function(*, *, *): string}
 */
const orientSetElHeight = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

/**
 * @param orient
 * @return {function(*, *, *): string}
 */
const orientSetElOffset = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.left = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.top = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

/**
 * @param orient
 * @return {function(*): void}
 */
const orientAddOrientClass = orient => {
  if (orient === 'EW') {
    return el => el.classList.add('east-west');
  } else {
    return el => el.classList.add('north-south');
  }
};

const resizeNest_ = (drgOffset, nestFlexBasis, model, isClose,
                     opt_onDoneFunc, opt_skipTrans) => {
  const context = model.context;
  const orientString = model.orient === 'EW' ? 'left' : 'top';
  const drgEl = model.ownDraggerEl;
  const nestEl = model.ownNest;
  const ms = 500;

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
        nestEl.classList.add('closed')
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
     * @type {Map<string, !HTMLDivElement>}
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
     * @type {Set<!HTMLDivElement>}
     * @private
     */
    this.splitNests_ = new Set();

    this.openFuncs_ = new Map();

    this.closeFuncs_ = new Map();

    this.draggerMap_ = new Map();

    window.addEventListener('resize', () => this.refreshAll_());
  };

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
   * @return {!HTMLDivElement | undefined}
   */
  getNest(s) {
    return this.nestMap_.get(s);
  }

  open(s, width, func, opt_skipAni = false) {
    if (this.openFuncs_.has(s)) {
      this.openFuncs_.get(s)(width, func, opt_skipAni);
    }
  }

  openAndUnlock(s, func, opt_skipAni = false) {
    if (this.openFuncs_.has(s)) {
      this.openFuncs_.get(s)(
          () => {
            this.unlock(s);
            maybeFunc(func)
          }, opt_skipAni);
    }
  }

  close(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(func, opt_skipAni);
    }
  }

  closeAndLock(s, func, opt_skipAni = false) {
    if (this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(
          () => {
            this.lock(s);
            maybeFunc(func)
          }, opt_skipAni);
    }
  }

  lock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].lock();
    }
  }

  unlock(s) {
    if (this.draggerMap_.has(s)) {
      this.draggerMap_.get(s)[1].unlock();
    }
  }

  get grabbers() {
    return [...this.draggerMap_.keys()];
  }

  /**
   * Split an element into 3
   * @param {HTMLDivElement=} opt_el The element to split. If not given, the
   *    components own element is used. Else, the element is checked to be
   *    a member of this split-group, and if so, is split.
   * @param {string=} orientation Only 'EW' or 'NS'.
   * @param {number=} widthA Width of the A nest
   * @param {number=} widthC Width of the C nest
   */
  addSplit(opt_el = void 0, orientation = 'EW', widthA = 100, widthC = 100) {

    // Sanitize input
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
    const orient = ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    const freedom = orient === 'EW' ? 'x' : 'y';
    const thickness = this.thickness_;
    const hT = this.halfThick_;
    const refA = `${refN}A`;
    const refB = `${refN}B`;
    const refC = `${refN}C`;
    const defOpenA = widthA || 200;
    const defOpenC = widthC || 200;
    const nullFunc = () => null;

    // Make sure the container is flexing.
    root.style.display = 'flex';
    root.style.flexDirection = orient === 'EW' ? 'row' : 'column';
    root.style.overflow = 'hidden';
    root.style.padding = '0';

    // Prep all the helper functions
    const getW = orientGetElWidth(orient);
    const getO = orientGetElOffset(orient);
    const setW = orientSetElWidth(orient);
    const setH = orientSetElHeight(orient);
    const setO = orientSetElOffset(orient);
    const addC = orientAddOrientClass(orient);

    // Make the nest elements
    const a = makeNestEl(setW, setH, addC, widthA, ['_A', refA]);
    const b = makeNestEl(setW, setH, addC, void 0, ['_B', refB]);
    const c = makeNestEl(setW, setH, addC, widthC, ['_C', refC]);
    [a, b, c].forEach(e => root.appendChild(e));

    // Make the dragger components
    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(setW, setH, addC, thickness);
    AB.render(root);
    const ab = AB.getElement();

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(setW, setH, addC, thickness);
    BC.render(root);
    const bc = BC.getElement();

    AB.model = {
        context:this,
        orient,
        hT,
        root,
        ownNest: a,
        ownDraggerEl: ab,
        midNest: b,
        otherNest: c,
        otherDraggerEl: bc,
        otherDragger: BC,
        matchOtherToNest: () => setO(bc, getW(a) + getW(b) - hT),
        ownOffset: () => getO(ab),
        nestOffset: () => getO(a),
        nestSize: () => getW(a),
        setOwnOffset: n => setO(ab, n),
        rootSize: () => getW(root),
        onDrag: actOnAB
    };

    BC.model = {
      context:this,
      orient,
      hT,
      root,
      ownNest: c,
      ownDraggerEl: bc,
      midNest: b,
      otherNest: a,
      otherDraggerEl: ab,
      otherDragger: AB,
      matchOtherToNest: () => setO(ab, getW(a) - hT),
      ownOffset: () => getO(bc),
      nestOffset: () => getO(c),
      nestSize: () => getW(c),
      setOwnOffset: n => setO(bc, n),
      rootSize: () => getW(root),
      onDrag: actOnBC
    };

    const matchDraggersToNest = () => {
      const aW = getW(a);
      setO(ab, aW - hT);
      setO(bc, aW + getW(b) - hT)
    };
    matchDraggersToNest();

    this.listen(AB, Component.compEventCode(), onDraggerEvent);
    this.listen(BC, Component.compEventCode(), onDraggerEvent);

    const openA = (value = defOpenA, opt_aF = nullFunc,
                   opt_skipTrans = false) => {
      resizeNest_(value, value, AB.model, false, opt_aF, opt_skipTrans);
    };

    const closeA = (opt_aF = nullFunc, opt_Trans = false) => {
      resizeNest_(0, 0, AB.model, true, opt_aF, opt_Trans);
    };

    const openC = (value = defOpenC, opt_aF = nullFunc,
                   opt_skipTrans = false) => {
      resizeNest_(getW(root) - value, value, BC.model, false, opt_aF, opt_skipTrans);
    };

    const closeC = (opt_aF = nullFunc, opt_skipTrans = false) => {
      resizeNest_(getW(root), 0, BC.model, true, opt_aF, opt_skipTrans);
    };

    this.listen(ab, EV.DBLCLICK, () => {
      const mustOpen = getO(ab) <= 30;
      mustOpen ? openA() : closeA();
    });

    this.listen(bc, EV.DBLCLICK, () => {
      const rootWidth = getW(root);
      const currentPos = rootWidth - getO(bc);
      const mustOpen = currentPos <= 30;
      mustOpen ? openC() : closeC();
    });

    // Make these things listen
    [...this.draggerMap_.values()]
        .filter(e => e[0] === orient)
        .map(e => e[1])
        .forEach(e => {
          this.listen(e, Component.compEventCode(), matchDraggersToNest)
        });

    this.refreshFuncs_.add(matchDraggersToNest);
    this.draggerMap_.set(refA, [orient, AB]).set(refC, [orient, BC]);
    this.nestMap_.set(refA, a).set(refB, b).set(refC, c);
    this.splitNests_.add(root);
    this.openFuncs_.set(refA, openA).set(refC, openC);
    this.closeFuncs_.set(refA, closeA).set(refC, closeC);
  }

}
