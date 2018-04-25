import Component from './component.js';
import Dragger from './dragger.js';
import {UiEventType} from '../events/uieventtype.js';
import {
  isNumber,
  randomId,
  isDefAndNotNull
} from '../../node_modules/badu/module/badu.mjs';
import { randomColour } from '../dom/utils.js';
import { EV } from '../events/mouseandtouchevents.js';


//--------------------------------------------------------------[ DOM Makers ]--
const makeNestEl = (setW, setH, addC, width) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'relative';
  el.style.backgroundColor = randomColour();
  if (isDefAndNotNull(width)) {
    el.style.flexBasis = width + 'px';
  } else {
    el.style.flexGrow = '1';
    setW(el, 0);
  }
  setH(el, 100, '%');
  addC(el);
  return el;
};

const makeDraggerEl = (setW, setH, addC, thickness) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addC(el);
  setH(el, 100, '%');
  setW(el, thickness);

  const grabber = document.createElement('div');
  grabber.classList.add('grabber');
  addC(grabber);

  el.appendChild(grabber);

  return el;
};


//----------------------------------------------------------[ Event Handlers ]--
const makeActOnAB = (getO, hT, bc, a, uS) => el => {
  const dOff = getO(el);
  a.style.flexBasis = dOff + hT + 'px';
  uS();
  el.style.zIndex = 1;
  bc.style.zIndex = 0;
};

const makeActOnBC = (getO, getW, hT, ab, c, root, uS) => el => {
  const dOff = getO(el);
  const rootRectWidth = getW(root);
  c.style.flexBasis = rootRectWidth - dOff - hT + 'px';
  uS();
  el.style.zIndex = 1;
  ab.style.zIndex = 0;
};

const onDraggerEvent = actOnDragger => e => {
  const data = e.detail.getData();
  switch (e.detail.getValue()) {
    case UiEventType.COMP_DRAG_MOVE:
      actOnDragger(data.target);
      break;
    case UiEventType.COMP_DRAG_START:
      console.log('mouse down');
      break;
    case UiEventType.COMP_DRAG_END:
      console.log('mouse up');
      break;
    default:
      // Do nothing.
  }
};


//-----------------------------------------------------[ Orientation Helpers ]--
const orientGetElWidth = orient => {
  if (orient === 'EW') {
    return el => el.getBoundingClientRect().width;
  } else {
    return el => el.getBoundingClientRect().height;
  }
};

const orientGetElOffset = orient => {
  if (orient === 'EW') {
    return el => el.offsetLeft;
  } else {
    return el => el.offsetTop;
  }
};

const orientSetElWidth = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientSetElHeight = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientSetElOffset = orient => {
  if (orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.left = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.top = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientAddOrientClass = orient => {
  if (orient === 'EW') {
    return el => el.classList.add('east-west');
  } else {
    return el => el.classList.add('north-south');
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
    this.thickness_ = isNumber(opt_thickness) ?  opt_thickness : 12;


    /**
     * Pre-calculated half-width of the draggers
     * @type {number}
     * @private
     */
    this.halfThick_ = this.thickness_ / 2;

    /**
     * Holds reference between the nest designation, and the nest element.
     * @type {Map<string, !Element>}
     * @private
     */
    this.nestMap_ = new Map();

    this.draggerMap_ = new Map()
        .set('NS', new Set())
        .set('EW', new Set());

    /**
     * @type {Set<Function>}
     * @private
     */
    this.refreshFuncs_ = new Set();

    /**
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {Set<!Element>}
     * @private
     */
    this.splitNests_ = new Set();

    this.openFuncs_ = new Map();

    this.closeFuncs_ = new Map();

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
   * @return {!Element | undefined}
   */
  getNest(s) {
    return this.nestMap_.get(s);
  }

  open(s, width, func) {
    if(this.openFuncs_.has(s)) {
      this.openFuncs_.get(s)(width, func);
    }
  }

  close(s, func) {
    if(this.closeFuncs_.has(s)) {
      this.closeFuncs_.get(s)(func);
    }
  }

  /**
   * Split an element into 3
   * @param {Element=} opt_el The element to split. If not given, the
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
    const orientString = orient === 'EW' ? 'left' : 'top';

    // Make sure the container is flexing.
    root.style.display = 'flex';
    root.style.flexDirection = orient === 'EW' ? 'row' : 'column';
    root.style.overflow = 'hidden';

    // Prep all the helper functions
    const getW = orientGetElWidth(orient);
    const getO = orientGetElOffset(orient);
    const setW = orientSetElWidth(orient);
    const setH = orientSetElHeight(orient);
    const setO = orientSetElOffset(orient);
    const addC = orientAddOrientClass(orient);

    // Make the nest elements
    const a = makeNestEl(setW, setH, addC, widthA);
    const b = makeNestEl(setW, setH, addC);
    const c = makeNestEl(setW, setH, addC, widthC);
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

    const matchDraggersToNest = () => {
      const aW = getW(a);
      setO(ab, aW - hT);
      setO(bc, aW + getW(b) - hT)
    };
    matchDraggersToNest();

    // Prep the methods that will act on the nest elements.
    const actOnAB_ = makeActOnAB(getO, hT, bc, a, matchDraggersToNest);
    const actOnBC_ = makeActOnBC(getO, getW, hT, ab, c, root, matchDraggersToNest);
    const actOnAB = onDraggerEvent(actOnAB_, bc, actOnBC_);
    const actOnBC = onDraggerEvent(actOnBC_, ab, actOnAB_);

    this.listen(AB, Component.compEventCode(), actOnAB);
    this.listen(BC, Component.compEventCode(), actOnBC);

    const resizeNest_ = (draggerTarget, nestTarget, bc, c, cb = () => null) => {
      this.listen(bc, EV.TRANSITIONEND, () => {
        bc.style.transition = null;
      }, {once: true});
      bc.style.transition = `${orientString} 500ms ease-in-out`;
      setO(bc, draggerTarget);

      this.listen(c, EV.TRANSITIONEND, () => {
        c.style.transition = null;
        this.refreshAll_();
        cb();
      }, {once: true});
      c.style.transition = 'flex-basis 500ms ease-in-out';
      c.style.flexBasis = `${nestTarget}px`;
    };

    const openA = (value = widthA, func = () => null) => {
      resizeNest_(value, value, ab, a, func);
    };

    const openC = (value = widthC, func = () => null) => {
      const rootWidth = getW(root);
      resizeNest_(rootWidth - value, value, bc, c, func);
    };

    const closeA = func => {
      resizeNest_(0, 0, ab, a, func);
    };

    const closeC = func => {
      const rootWidth = getW(root);
      resizeNest_(rootWidth, 0, bc, c, func);
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
    const draggers = this.draggerMap_.get(`${orient}`);
    for (const e of draggers) {
      this.listen(e, Component.compEventCode(), matchDraggersToNest)
    }
    draggers.add(AB);
    draggers.add(BC);

    this.refreshFuncs_.add(matchDraggersToNest);
    this.nestMap_.set(`${refN}A`, a).set(`${refN}B`, b).set(`${refN}C`, c);
    this.splitNests_.add(root);
    this.openFuncs_.set(`${refN}A`, openA).set(`${refN}C`, openC);
    this.closeFuncs_.set(`${refN}A`, closeA).set(`${refN}C`, closeC);
  }

}
