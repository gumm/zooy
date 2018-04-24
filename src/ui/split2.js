import Component from './component.js';
import Dragger from './dragger.js';
import { UiEventType } from '../events/uieventtype.js';
import { randomId, isDefAndNotNull } from '../../node_modules/badu/module/badu.mjs';

const randomColour = opt_a => {
  return [1,2,3].map(() => Math.floor(Math.random() * 256) + 1)
      .reduce((p,c) => `${p}${c},`, 'rgba(') + `${opt_a ? opt_a : 0.5}`;
};


const makeNestEl = (setElWidth, setElHeight, addOrientClass, width) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'relative';
  el.style.backgroundColor = randomColour();
  if (isDefAndNotNull(width)) {
    el.style.flexBasis = width + 'px';
  } else {
    el.style.flexGrow = '1';
    setElWidth(el, 0);
  }
  setElHeight(el, 100, '%');
  addOrientClass(el);
  return el;
};

const makeDraggerEl = (addOrientClass, setElHeight, setElWidth, setElOffset,
                       thickness) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  addOrientClass(el);
  setElHeight(el, 100, '%');
  setElWidth(el, thickness);
  return el;
};


const makeActOnAB = (getElOffset, getElWidth, setElOffset, thickness, ab, bc, a, b, c, root, uS) =>
    el => {
      const dOff = getElOffset(el);
      a.style.flexBasis = dOff + thickness + 'px';
      uS();
      el.style.zIndex = 1;
      bc.style.zIndex = 0;

    };

const makeActOnBC = (getElOffset, getElWidth, setElOffset, thickness, ab, bc, a, b, c, root, uS) =>
    el => {
      const dOff = getElOffset(el);
      const rootRectWidth = getElWidth(root);
      c.style.flexBasis = rootRectWidth - dOff - thickness + 'px';
      uS();
      el.style.zIndex = 1;
      ab.style.zIndex = 0;
    };

//----------------------------------------------------------[ Event Handlers ]--
const onDraggerMoved = actOnDragger => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    actOnDragger(e.detail.getData().target);
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
class Split2 extends Component {

  constructor() {
    super();

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
     * Once a nest (or the root element) is split, it ends here, and
     * this is checked to make sure we don't split the same thing twice.
     * @type {Array<!Element>}
     * @private
     */
    this.splitNests_ = [];


    this.updateFuncs_ = [];

    window.addEventListener('resize', () => this.updateFuncs_.forEach(e => e()));


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
  addSplit(opt_el=void 0, orientation='EW', thickness=8, widthA=100, widthB=100) {

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
    const halfThick = thickness / 2;

    // Make sure the container is flexing.
    root.style.display = 'flex';
    root.style.flexDirection = orient === 'EW' ? 'row' : 'column';

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
    const c = makeNestEl(setW, setH, addC, widthB);
    [a, b, c].forEach(e => root.appendChild(e));


    // Make the dragger components
    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(addC, setH, setW, setO, thickness);
    AB.render(root);
    const ab = AB.getElement();

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(addC, setH, setW, setO, thickness);
    BC.render(root);
    const bc = BC.getElement();

    const updateSelf = () => {
      const aW = getW(a);
      setO(ab, aW - halfThick);
      setO(bc, aW + getW(b) - halfThick)
    };
    updateSelf();
    this.updateFuncs_.push(updateSelf);

    this.nestMap_.set(`${refN}A`, a).set(`${refN}B`, b).set(`${refN}C`, c);
    this.splitNests_.push(root);



    // Prep the methods that will act on the nest elements.
    const actOnAB_ = makeActOnAB(getO, getW, setO, halfThick, ab, bc, a, b, c, root, updateSelf);
    const actOnBC_ = makeActOnBC(getO, getW, setO, halfThick, ab, bc, a, b, c, root, updateSelf);
    const actOnAB = onDraggerMoved(actOnAB_, bc, actOnBC_);
    const actOnBC = onDraggerMoved(actOnBC_, ab, actOnAB_);

    this.listen(AB,  Component.compEventCode(), actOnAB);
    this.listen(BC, Component.compEventCode(), actOnBC);



    // Make these things listen
    const draggers = this.draggerMap_.get(`${orient}`);
    for (const e of draggers) {
      this.listen(e, Component.compEventCode(), updateSelf)
    }
    draggers.add(AB);
    draggers.add(BC);
  }

}

export default Split2;