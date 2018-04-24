import Component from './component.js';
import Dragger from './dragger.js';
import { UiEventType } from '../events/uieventtype.js';
import { randomId } from '../../node_modules/badu/module/badu.mjs';


const makeNestEl = (setElHeight, addOrientClass) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'absolute';
  setElHeight(el, 100, '%');
  addOrientClass(el);
  return el;
};

const makeDraggerEl = (addOrientClass, setElHeight, setElWidth, setElOffset,
                       thickness, offset) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addOrientClass(el);
  setElHeight(el, 100, '%');
  setElWidth(el, thickness);
  setElOffset(el, offset);
  return el;
};


const makeActOnAB = (getElOffset, getElWidth, setElWidth, setElOffset,
                     thickness, a, b, c) =>
    (el, opt_bc, opt_func) => {

      // Prevent dragger from crossing
      if (opt_bc && opt_func) {
        if (getElOffset(el) >= getElOffset(opt_bc)) {
          setElOffset(opt_bc, getElOffset(el));
          opt_func(opt_bc);
        }
      }

      const abX = getElOffset(el);
      setElWidth(a, abX);
      setElOffset(b, abX + thickness);
      setElWidth(b, getElOffset(c) - abX - thickness * 2);
    };

const makeActOnBC = (getElOffset, getElWidth, setElWidth, setElOffset,
                     thickness, b, c, root) =>
    (el, opt_ab, opt_func) => {

      // Prevent dragger from crossing
      if (opt_ab && opt_func) {
        if (getElOffset(el) <= getElOffset(opt_ab)) {
          setElOffset(opt_ab, getElOffset(el));
          opt_func(opt_ab);
        }
      }

      const bcX = getElOffset(el);
      const rootRectWidth = getElWidth(root);
      setElWidth(b, bcX - getElOffset(b));
      setElWidth(c, rootRectWidth - bcX - thickness);
      setElOffset(c, bcX + thickness);
    };

//----------------------------------------------------------[ Event Handlers ]--
const onDraggerMoved = (actOnDragger, otherDragEl, actOnOtherDragger) => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    const draggerEl = e.detail.getData().target;
    actOnDragger(draggerEl, otherDragEl, actOnOtherDragger);
  }
};


//-----------------------------------------------------[ Orientation Helpers ]--
const orientGetElWidth = orient => {
  if(orient === 'EW') {
    return el => el.getBoundingClientRect().width;
  } else {
    return el => el.getBoundingClientRect().height;
  }
};

const orientGetElOffset = orient => {
  if(orient === 'EW') {
    return el => el.offsetLeft;
  } else {
    return el => el.offsetTop;
  }
};

const orientSetElWidth = orient => {
  if(orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientSetElHeight = orient => {
  if(orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.height = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.width = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientSetElOffset = orient => {
  if(orient === 'EW') {
    return (el, num, op_unit) =>
        el.style.left = `${num}${op_unit ? op_unit : 'px'}`;
  } else {
    return (el, num, op_unit) =>
        el.style.top = `${num}${op_unit ? op_unit : 'px'}`;
  }
};

const orientAddOrientClass = orient => {
  if(orient === 'EW') {
    return el => el.classList.add('east-west');
  } else {
    return el => el.classList.add('north-south');
  }
};


//--------------------------------------------------------------[ Main Class ]--
class Split extends Component {

  constructor() {
    super();

    /**
     * Holds reference between the nest designation, and the nest element.
     * @type {Map<string, !Element>}
     * @private
     */
    this.nestMap_ = new Map();

    /**
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {Array<!Element>}
     * @private
     */
    this.splitNests_ = [];

    this.draggerMap_ = new Map()
        .set('NS', new Set())
        .set('EW', new Set())
  };

  /**
   * @return {Array<!Element>}
   */
  get nestElements() {
    return [...this.nestMap_.values()];
  }

  /**
   * @return {Array<string>}
   */
  get nestNames() {
    return [...this.nestMap_.keys()];
  }

  /**
   * @return {Map<string, !Element>}
   */
  get nestMap() {
    return this.nestMap_;
  }

  /**
   * @param s
   * @return {!Element | undefined}
   */
  getNest(s) {
    return this.nestMap_.get(s);
  }

  /**
   * Split an element into 3
   * @param {Element=} opt_el The element to split. If not given, the
   *    components own element is used. Else, the element is checked to be
   *    a member of this split-group, and if so, is split.
   * @param {string=} orientation Only 'EW' or 'NS'.
   * @param {number=} thickness Thickness of the dragger
   */
  addSplit(opt_el=void 0, orientation='EW', thickness=20, widthA=50, widthB=50) {

    // Sanitize input
    let root = opt_el ? opt_el : this.getElement();
    let refN = '';
    if (opt_el) {
      const match = [...this.nestMap_.entries()].find(([k,v]) => v === opt_el);
      if (match) {
        refN = match[0];
        root = match[1];
      } else {
        return ['Element not managed by this component', opt_el];
      }
    }
    if (this.splitNests_.includes(root)) {
      return ['Already used!', root];
    }
    const orient =  ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    const freedom = orient === 'EW' ? 'x' : 'y';

    // Prep all the helper functions
    const getW = orientGetElWidth(orient);
    const getO = orientGetElOffset(orient);
    const setW = orientSetElWidth(orient);
    const setH = orientSetElHeight(orient);
    const setO = orientSetElOffset(orient);
    const addC = orientAddOrientClass(orient);

    // Make the nest elements
    const a = makeNestEl(setH, addC);
    const b = makeNestEl(setH, addC);
    const c = makeNestEl(setH, addC);
    [a, b, c].forEach(e => root.appendChild(e));

    // Prep the methods that will act on the nest elements.
    const actOnAB_ = makeActOnAB(getO, getW, setW, setO, thickness, a, b, c);
    const actOnBC_ = makeActOnBC(getO, getW, setW, setO, thickness, b, c, root);

    // Make the dragger components
    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(addC, setH, setW, setO, thickness, widthA);
    AB.render(root);
    const ab = AB.getElement();

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(addC, setH, setW, setO, thickness, getW(root) - thickness - widthB);
    BC.render(root);
    const bc = BC.getElement();


    this.nestMap_.set(`${refN}A`, a).set(`${refN}B`, b).set(`${refN}C`, c);
    this.splitNests_.push(root);

    const actOnAB = onDraggerMoved(actOnAB_, bc, actOnBC_);
    const actOnBC = onDraggerMoved(actOnBC_, ab, actOnAB_);

    const updateSelf = () => {
      actOnBC_(bc);
      actOnAB_(ab);
    };
    updateSelf();

    const externalChange = () => {
      updateSelf();
    };

    this.listen(AB,  Component.compEventCode(), actOnAB);
    this.listen(BC, Component.compEventCode(), actOnBC);

    // Make these things listen
    const draggers = this.draggerMap_.get(`${orient}`);
    for (const e of draggers) {
      this.listen(e, Component.compEventCode(), externalChange)
    }
    draggers.add(AB);
    draggers.add(BC);

  }

}

export default Split