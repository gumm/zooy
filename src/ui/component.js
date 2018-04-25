import { UiEventType } from '../events/uieventtype.js'
import { removeNode, isInPage } from '../dom/utils.js';
import { isDef } from "../../node_modules/badu/module/badu.mjs";


/**
 * Errors thrown by the component.
 * @enum {string}
 */
const ComponentError = {
  /**
   * Error when a method is not supported.
   */
  NOT_SUPPORTED: 'Method not supported',

  /**
   * Error when the given element can not be decorated.
   */
  DECORATE_INVALID: 'Invalid element to decorate',

  /**
   * Error when the component is already rendered and another render attempt is
   * made.
   */
  ALREADY_RENDERED: 'Component already rendered',

  /**
   * Error when an attempt is made to set the parent of a component in a way
   * that would result in an inconsistent object graph.
   */
  PARENT_UNABLE_TO_BE_SET: 'Unable to set parent component',

  /**
   * Error when an attempt is made to add a child component at an out-of-bounds
   * index.  We don't support sparse child arrays.
   */
  CHILD_INDEX_OUT_OF_BOUNDS: 'Child component index out of bounds',

  /**
   * Error when an attempt is made to remove a child component from a component
   * other than its parent.
   */
  NOT_OUR_CHILD: 'Child is not in parent component',

  /**
   * Error when an operation requiring DOM interaction is made when the
   * component is not in the document
   */
  NOT_IN_DOCUMENT: 'Operation not supported while component is not in document',

  /**
   * Error when an invalid component state is encountered.
   */
  STATE_INVALID: 'Invalid component state'
};



class Component extends EventTarget {

  constructor() {
    super();

    /**
     * A function that returns a newly minted element.
     * @return {HTMLElement}
     * @private
     */
    this.makeDomFunc_ = () => document.createElement('div');


    /**
     * Whether the component is in the document.
     * @private {boolean}
     */
    this.inDocument_ = false;

    /**
     * The DOM element for the component.
     * @private {Element}
     */
    this.element_ = null;

    /**
     * Arbitrary data object associated with the component.  Such as meta-data.
     * @private {*}
     */
    this.model_ = null;

    /**
     * A DOM element where this component will be rendered to.
     * This does not need to be an element in this component's parent DOM.
     * @private {Element?}
     */
    this.target_ = null;

    /**
     * Parent component to which events will be propagated.  This property is
     * strictly private and must not be accessed directly outside of this class!
     * @private {Component?}
     */
    this.parent_ = null;

    /**
     * A map of child components.  Lazily initialized on first use.  Must be
     * kept in sync with `childIndex_`.  This property is strictly private and
     * must not be accessed directly outside of this class!
     * @private {Map<string, Component>?}
     */
    this.children_ = new Map();

    /**
     * A map of listener targets to a object of event: functions
     * When adding a listener, immediately also create the un-listen functions
     * and store those in a object keyed with the event.
     * Store these objects against the target in a map
     * @type {Map<EventTarget, Object<string, Function>>}
     * @private
     */
    this.listeningTo_ = new Map();

    /**
     * A set of components that are currently listening to this component
     * @type {Set<any>}
     * @private
     */
    this.isObservedBy_ = new Set();

    /**
     * A function guaranteed to be called before the component ready
     * event is fired.
     * @type {Function}
     * @private
     */
    this.beforeReadyFunc_ = () => null;

  };


  //----------------------------------------------------------------[ Static ]--
  static makeEvent(event, data)  {
    return new CustomEvent(event, {detail: data});
  };

  static compEventCode() {
    return UiEventType.COMP;
  }

  static compReadyCode() {
    return UiEventType.READY;
  }


  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * Sets the model associated with the UI component.
   * @param {*} m
   */
  set model(m) {
    this.model_ = m;
  }

  /**
   * Returns the model associated with the UI component.
   * @return {*}
   */
  get model() {
    return this.model_
  }


  /**
   * @param {boolean} bool
   */
  set isInDocument(bool) {
    this.inDocument_ = bool;
  }

  /**
   * @return {boolean}
   */
  get isInDocument() {
    return this.inDocument_;
  }

  /**
   * A function that makes a DOM element.
   * @param {!function():!Element} func
   */
  set domFunc(func) {
    this.makeDomFunc_ = func;
  }


  //-----------------------------------------------[ Listeners and Listening ]--
  /**
   * @param {EventTarget|Component} comp
   */
  isListenedToBy(comp) {
    this.isObservedBy_.add(comp);
  }

  /**
   * @param {EventTarget|Component} target
   * @param {string} event
   * @param {Function} action
   * @param {boolean|Object} options
   */
  listen(target, event, action, options=false) {
    target.addEventListener(event, action, options);
    const currVal = this.listeningTo_.get(target) || {};
    currVal[event] = () => target.removeEventListener(event, action, options);
    this.listeningTo_.set(target, currVal);

    if (isDef(target.isListenedToBy)) {
      target.isListenedToBy(this);
    }
  };

  /**
   * Remove self from all components tt are listening to me.
   */
  stopBeingListenedTo() {
    for (const observer of this.isObservedBy_) {
      observer.stopListeningTo(this);
      this.isObservedBy_.delete(observer);
    }
  }

  /**
   * Stop listening to all events on target.
   * @param {EventTarget|Component} target
   * @param {string?} opt_event
   */
  stopListeningTo(target, opt_event) {
    if (this.listeningTo_.has(target)) {
      if (isDef(opt_event)) {
        Object.entries(this.listeningTo_.get(target)).forEach(([key, value]) => {
          if (key === opt_event) {
            value();
          }
        });
        if (!Object.keys(this.listeningTo_.get(target)).length) {
          this.listeningTo_.delete(target);
        }
      } else {
        Object.values(this.listeningTo_.get(target)).forEach(e => e());
        this.listeningTo_.delete(target);
      }

    }
  }

  /**
   * Removes all the event listeners that is managed by this
   * component.
   */
  removeAllListener() {
    for (const target of this.listeningTo_.keys()) {
      this.stopListeningTo(target);
    }
  }


  //--------------------------------------------------------[ DOM Management ]--
  /**
   * Gets the component's element.
   * @return {Element} The element for the component.
   */
  getElement() {
    return this.element_;
  };

  /**
   * Creates the initial DOM representation for the component.  The default
   * implementation is to set this.element_ = div.
   */
  createDom() {
    this.element_ = this.makeDomFunc_()
  };


  /**
   * Renders the component.  If a parent element is supplied, the component's
   * element will be appended to it.  If there is no optional parent element and
   * the element doesn't have a parentNode then it will be appended to the
   * document body.
   *
   * If this component has a parent component, and the parent component is
   * not in the document already, then this will not call `enterDocument`
   * on this component.
   *
   * Throws an Error if the component is already rendered.
   *
   * @param {Element=} opt_parentElement Optional parent element to render the
   *    component into.
   */
  render(opt_parentElement) {
    this.render_(opt_parentElement);
  };


  /**
   * Renders the component.  If a parent element is supplied, the component's
   * element will be appended to it.  If there is no optional parent element and
   * the element doesn't have a parentNode then it will be appended to the
   * document body.
   *
   * If this component has a parent component, and the parent component is
   * not in the document already, then this will not call `enterDocument`
   * on this component.
   *
   * Throws an Error if the component is already rendered.
   *
   * @param {Element=} opt_target Optional parent element to render the
   *    component into.
   * @private
   */
  render_(opt_target) {
    if (this.isInDocument) {
      throw new Error(ComponentError.ALREADY_RENDERED);
    }

    if (!this.element_) {
      this.createDom();
    }

    if (opt_target) {
      this.target_ = opt_target;
    }

    if (this.target_) {
      if (!isInPage(this.element_)) {
        this.target_.insertBefore(this.element_, null);
      }
    } else {
      if (!isInPage(this.element_)) {
        document.body.appendChild(this.element_);
      }
    }

    // If this component has a parent component that isn't in the document yet,
    // we don't call enterDocument() here.  Instead, when the parent component
    // enters the document, the enterDocument() call will propagate to its
    // children, including this one.  If the component doesn't have a parent
    // or if the parent is already in the document, we call enterDocument().
    if (!this.parent_ || this.parent_.isInDocument) {
      this.enterDocument();
    }
  };


  //------------------------------------------------------------[ Life-cycle ]--
  /**
   * @param {Function} func A callback guaranteed to fire after the panels is
   * ready, and in the document, but before the
   * {@code UiEventType.READY} event is fired.
   */
  setBeforeReadyCallback(func) {
    this.beforeReadyFunc_ = func;
  };


  executeBeforeReady() {
    this.beforeReadyFunc_();
  }

  /**
   * Called when the component's element is known to be in the document. Anything
   * using document.getElementById etc. should be done at this stage.
   *
   * If the component contains child components, this call is propagated to its
   * children.
   */
  enterDocument() {
    this.isInDocument = true;

    // Propagate enterDocument to child components that have a DOM, if any.
    // If a child was decorated before entering the document (permitted when
    // goog.ui.Component.ALLOW_DETACHED_DECORATION is true), its enterDocument
    // will be called here.
    [...this.children_.values()].forEach(child => {
      if (!child.isInDocument && child.getElement()) {
        child.enterDocument();
      }
    });

    this.executeBeforeReady();
    this.dispatchCompEvent(UiEventType.READY);

  };

  /**
   * Called by dispose to clean up the elements and listeners created by a
   * component, or by a parent component/application who has removed the
   * component from the document but wants to reuse it later.
   *
   * If the component contains child components, this call is propagated to its
   * children.
   *
   * It should be possible for the component to be rendered again once this
   * method has been called.
   */
  exitDocument() {
    // Propagate exitDocument to child components that have been rendered, if any.

    [...this.children_.values()].forEach(child => {
      if (child.isInDocument) {
        child.exitDocument();
      }
    });

    this.stopBeingListenedTo();
    this.removeAllListener();
    this.isInDocument = false;
  };


  /**
   * Disposes of the component.  Calls `exitDocument`, which is expected to
   * remove event handlers and clean up the component.  Propagates the call to
   * the component's children, if any. Removes the component's DOM from the
   * document unless it was decorated.
   * @override
   * @protected
   */
  disposeInternal() {
    if (this.isInDocument) {
      this.exitDocument();
    }

    this.stopBeingListenedTo();
    this.removeAllListener();

    // Disposes of the component's children, if any.
    [...this.children_.values()].forEach(child => child.disposeInternal());

    // Detach the component's element from the DOM, unless it was decorated.
    if (this.element_) {
      removeNode(this.element_);
    }

    this.children_ = null;
    this.childIndex_ = null;
    this.element_ = null;
    this.model_ = null;
    this.parent_ = null;

  };


  //-------------------------------------------------------[ Built in events ]--
  /**
   * Dispatches a {@code UiEventType.COMP} event.
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
  dispatchCompEvent(value, opt_data) {
    const dataObj = new CompEventData(value, opt_data);
    const event = Component.makeEvent(UiEventType.COMP, dataObj);
    return this.dispatchEvent(event);
  };

}


//--------------------------------------------[ Standard component event data]--
class CompEventData {
  constructor(value, opt_data) {
    /**
     * @type {string|number}
     * @private
     */
    this.value_ = value;

    /**
     * @type {string|number|Object|Map|Set}
     * @private
     */
    this.data_ = opt_data || {};
  }

  getValue() {
    return this.value_;
  }

  getData() {
    return this.data_;
  }
}


export { CompEventData };
export default Component;