import Component from './component.js';
import Dragger from './dragger.js';
import { UiEventType } from '../events/uieventtype.js';
import { randomId } from '../../node_modules/badu/module/badu.mjs';

const makeNestEl = (orient, opt_end) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('nest');
  el.style.position = 'absolute';
  switch (orient) {
    case 'NS':
      el.classList.add('north-south');
      el.style.width = '100%';
      opt_end ? el.style.bottom = '0' : null;
      break;
    default:  // Default is EW
      el.classList.add('east-west');
      el.style.height = '100%';
      opt_end ? el.style.right = '0' : null;
  }
  return el;
};

const makeDraggerEl = (orient, thickness, offset) => () => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.classList.add('dragger');
  el.style.position = 'absolute';
  switch (orient) {
    case 'NS':
      el.classList.add('north-south');
      el.style.height = thickness + 'px';
      el.style.width = '100%';
      el.style.top = offset + '%';
      break;
    default:  // Default is EW
      el.classList.add('east-west');
      el.style.height = '100%';
      el.style.width = thickness + 'px';
      el.style.left = offset + '%';
  }
  return el;
};


const makeActOnAB = (orient, thickness, A, B) => {
  if (orient === 'EW') {
    return el => {
      const abX = el.offsetLeft;
      A.style.width = `${abX}px`;
      B.style.left = `${abX + thickness}px`;
    }
  } else {
    return el => {
      const abY = el.offsetTop;
      A.style.height = `${abY}px`;
      B.style.top = `${abY + thickness}px`;
    }
  }
};

const makeActOnBC = (orient, thickness, B, C, root) => {
  if (orient === 'EW') {
    return el => {
      const bcX = el.offsetLeft;
      const rootRect = root.getBoundingClientRect();
      B.style.right = `${rootRect.width - bcX}px`;
      C.style.width = `${rootRect.width - bcX - thickness}px`;
      C.style.right = '0';
    }
  } else {
    return el => {
      const bcY = el.offsetTop;
      const rootRect = root.getBoundingClientRect();
      B.style.bottom = `${rootRect.height - bcY}px`;
      C.style.height = `${rootRect.height - bcY - thickness}px`;
      C.style.bottom = '0';
    }
  }
};

const onABMoved = (orient, thickness, bc, actOnAB_, actOnBC_) => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    const ab = e.detail.getData().target;
    if(orient === 'EW') {
      if (ab.offsetLeft + thickness > bc.offsetLeft) {
        bc.style.left = `${ab.offsetLeft + thickness}px`;
        actOnBC_(bc);
      }
    } else {
      if (ab.offsetTop + thickness > bc.offsetTop) {
        bc.style.top = `${ab.offsetTop + thickness}px`;
        actOnBC_(bc);
      }
    }
    actOnAB_(ab);
  }
};

const onBCMoved = (orient, thickness, ab, actOnAB_, actOnBC_) => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    const bc = e.detail.getData().target;
    if(orient === 'EW') {
      if (bc.offsetLeft < ab.offsetLeft + thickness) {
        ab.style.left = `${bc.offsetLeft - thickness}px`;
        actOnAB_(ab);
      }
    } else {
      if (bc.offsetTop < ab.offsetTop + thickness) {
        ab.style.top = `${bc.offsetTop - thickness}px`;
        actOnAB_(ab);
      }
    }
    actOnBC_(bc);
  }
};

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
  addSplit(opt_el=void 0, orientation='EW', thickness=20) {

    let root = opt_el ? opt_el : this.getElement();
    let refN = '';
    if (opt_el) {
      const match = [...this.nestMap_.entries()].find(([k,v]) => v === opt_el);
      if (match) {
        refN = match[0];
        root = match[1];
      } else {
        console.log(match);
        return;
      }
    }
    if (this.splitNests_.includes(root)) {
      return ['Already used!', root];
    }

    const orient =  ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    const freedom = orient === 'EW' ? 'x' : 'y';

    const a = makeNestEl(orient);
    const b = makeNestEl(orient);
    const c = makeNestEl(orient, true);

    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(orient, thickness, 33);

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(orient, thickness, 66);

    [a, b, c].forEach(e => root.appendChild(e));
    AB.render(root);
    BC.render(root);

    // Store a reference to the dragger elements.
    const ab = AB.getElement();
    const bc = BC.getElement();

    this.nestMap_.set(`${refN}A`, a).set(`${refN}B`, b).set(`${refN}C`, c);
    this.splitNests_.push(root);

    const actOnAB_ = makeActOnAB(orient, thickness, a, b);
    const actOnBC_ = makeActOnBC(orient, thickness, b, c, root);
    const actOnAB = onABMoved(orient, thickness, bc, actOnAB_, actOnBC_);
    const actOnBC = onBCMoved(orient, thickness, ab, actOnAB_, actOnBC_);

    const updateSelf = () => {
      actOnAB_(ab);
      actOnBC_(bc);
    };
    updateSelf();

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

export default Split