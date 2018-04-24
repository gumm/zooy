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
      el.style.top = offset + 'px';
      break;
    default:  // Default is EW
      el.classList.add('east-west');
      el.style.height = '100%';
      el.style.width = thickness + 'px';
      el.style.left = offset + 'px';
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
      C.style.left = `${bcX + thickness}px`;
      C.style.right = '0';
    }
  } else {
    return el => {
      const bcY = el.offsetTop;
      const rootRect = root.getBoundingClientRect();
      B.style.bottom = `${rootRect.height - bcY}px`;
      C.style.top = `${bcY + thickness}px`;
      C.style.bottom = '0';
    }
  }
};

const onABMoved = (orient, thickness, BC, actOnAB_, actOnBC_) => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    const ab = e.detail.getData().target;
    const bc = BC.getElement();
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

const onBCMoved = (orient, thickness, AB, actOnAB_, actOnBC_) => e => {
  if (e.detail.getValue() === UiEventType.COMP_DRAG_MOVE) {
    const bc = e.detail.getData().target;
    const ab = AB.getElement();
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

  constructor(orientation) {
    super();

    /**
     * One of 'EW' (East-West) or 'NS' (North-South)
     * Default EW
     * @type {string}
     * @private
     */
    this.orientation = ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
  };

  addSplit(opt_el=void 0, orientation='EW', thickness=20) {

    const orient =  ['EW', 'NS'].includes(orientation) ? orientation : 'EW';
    const freedom = orient === 'EW' ? 'x' : 'y';
    const root = opt_el ? opt_el : this.getElement();

    const A = makeNestEl(orient);
    const B = makeNestEl(orient);
    const C = makeNestEl(orient, true);

    const AB = new Dragger(freedom);
    AB.domFunc = makeDraggerEl(orient, thickness, 200);

    const BC = new Dragger(freedom);
    BC.domFunc = makeDraggerEl(orient, thickness, 500);

    [A, B, C].forEach(e => root.appendChild(e));
    AB.render(root);
    BC.render(root);

    const actOnAB_ = makeActOnAB(orient, thickness, A, B);
    const actOnBC_ = makeActOnBC(orient, thickness, B, C, root);
    const actOnAB = onABMoved(orient, thickness, BC, actOnAB_, actOnBC_);
    const actOnBC = onBCMoved(orient, thickness, AB, actOnAB_, actOnBC_);

    actOnAB_(AB.getElement());
    actOnBC_(BC.getElement());

    this.listen(AB,  Component.compEventCode(), actOnAB);
    this.listen(BC, Component.compEventCode(), actOnBC);

  }

}

export default Split