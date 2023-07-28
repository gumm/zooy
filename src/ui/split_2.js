import Component from './component.js';
import {UiEventType} from '../events/uieventtype.js';
import {
  identity, randomId,
} from 'badu';
import EVT from "./evt.js";
import ZooyEventData from "../events/zooyeventdata.js";


//----------------------------------------------------------------------[ DOM Makers ]--
/**
 * @param {!Element} el
 * @param {!string} orientation
 * @return {!Element}
 */
const convertElToSplit = (el, orientation) => {
  // el.setAttribute('id', randomId(7));
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
  el.style.flexGrow = 1;
  el.style.flexShrink = 1;
  classArr.forEach(e => el.classList.add(e));
  return el;
};

/**
 * @param {!Array<string>} classArr
 * @return {!Element}
 */
const makeDraggerEl = (classArr = []) => {
  const el = document.createElement('div');
  el.setAttribute('id', randomId(7));
  el.setAttribute('draggable', true);
  el.classList.add('zoo_dragger');
  classArr.forEach(e => el.classList.add(e));

  // Append an inner grabber.
  const grabber = document.createElement('div');
  grabber.classList.add('zoo_grabber');
  el.appendChild(grabber);
  return el;
};

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
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
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
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
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
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
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
  closeAndLock(nestName, callback, opt_skipAni = false) {
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
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
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
    const targetSize = size || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed');
    dragEl.classList.remove('locked');
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
    const {nestEl, dragEl, defSize} = this.nestMap_.get(nestName);
    const targetSize = size || defSize;
    nestEl.classList.remove('closed');
    dragEl.classList.remove('closed');
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
  close(nestName, callback, opt_skipAni = false) {
     this.resize(nestName, 0, callback, opt_skipAni);
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
   * @param defSizeA {?number}
   * @param defSizeC {?number}
   */
  addSplit(opt_el = void 0, orientation = 'EW', defSizeA = 10, defSizeC = 10) {

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
    const A = makeOuterNest(defSizeA, ['zoo_nest__A', refA]);
    const AB = makeDraggerEl();
    this.nestMap_.set(refA, {nestEl: A, dragEl: AB, defSize: defSizeA});

    // Middle nests don't have accosted daggers
    const refB = `${refN}B`;
    const B = makeInnerNest(['zoo_nest__B', refB]);
    this.nestMap_.set(refB, {nestEl: B});

    // Outer nest and its dragger
    const refC = `${refN}C`;
    const BC = makeDraggerEl();
    const C = makeOuterNest(defSizeC, ['zoo_nest__C', refC]);
    this.nestMap_.set(refC, {nestEl: C, dragEl: BC, defSize: defSizeC});

    [A, AB, B, BC, C].forEach(e => root.appendChild(e));

    // // Extend the dragger's model with the required info about this setup
    // // to be able to do everything it needs functionally.
    // AB.model = {
    //   context: this,
    //   orientation,
    //   defaultSize: defSizeA,
    //   root,
    //   doDrag: identity,
    //   unClose: identity,
    //   mustOpen: identity,
    //   toggle: identity,
    //   close: identity,
    //   onDragEnd: identity,
    // };
    //
    // BC.model = {
    //   context: this,
    //   orientation,
    //   defaultSize: defSizeC,
    //   root,
    //   doDrag: identity,
    //   unClose: identity,
    //   mustOpen: identity,
    //   toggle: identity,
    //   close: identity,
    //   onDragEnd: identity,
    // };

    let sizeA;
    let yStart;
    let yRef;
    let yDelta;

    this.listen(A, "transitionend", (event) => {
      const callback = this.nestCallbackMap_.get(refA);
      this.nestCallbackMap_.delete(refA);
      callback && callback();
    });
    this.listen(C, "transitionend", (event) => {
      const callback = this.nestCallbackMap_.get(refC);
      this.nestCallbackMap_.delete(refC);
      callback && callback();
    })

    if (orientation === 'NS') {
      AB.addEventListener("dragstart", (event) => {
        event.dataTransfer.setDragImage(this.dragImage_, 0, 0);
        sizeA = A.getBoundingClientRect().height;
      });
      AB.addEventListener("drag", (event) => {
        sizeA = sizeA + event.offsetY
        A.style.flexBasis = sizeA + 'px'
      });

      BC.addEventListener("dragstart", (event) => {
        event.dataTransfer.setDragImage(this.dragImage_, 0, 0);
        yStart = C.getBoundingClientRect().height;
        yDelta = 0;
        yRef = event.y;
      });
      BC.addEventListener("drag", (event) => {
        const val = event.y
        if (val !== 0) {
          yDelta = yRef - val;
          C.style.flexBasis = yStart + yDelta + 'px'
        }
      });
    } else {
      AB.addEventListener("dragstart", (event) => {
        event.dataTransfer.setDragImage(this.dragImage_, 0, 0);
        sizeA = A.getBoundingClientRect().width;
      });
      AB.addEventListener("drag", (event) => {
        sizeA = sizeA + event.offsetX
        A.style.flexBasis = sizeA + 'px'
      });

      BC.addEventListener("dragstart", (event) => {
        event.dataTransfer.setDragImage(this.dragImage_, 0, 0);
        yStart = C.getBoundingClientRect().width;
        yDelta = 0;
        yRef = event.x;
      });
      BC.addEventListener("drag", (event) => {
        const val = event.x
        if (val !== 0) {
          yDelta = yRef - val;
          C.style.flexBasis = yStart + yDelta + 'px'
        }
      });
    }


    // Park the split so the component getters and setters can get to it.
    // this.refreshFuncs_.add(matchDraggersToNest);
    // this.draggerMap_.set(refA, [orient, AB]).set(refC, [orient, BC]);
    // this.nestMap_.set(refA, a).set(refB, b).set(refC, c);
    // this.splitNests_.add(root);
    // this.resizeFuncs_
    //   .set(refA, AB.model.resize)
    //   .set(refC, BC.model.resize);
    // this.closeFuncs_
    //   .set(refA, AB.model.close)
    //   .set(refC, BC.model.close);
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
