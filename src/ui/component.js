import ZooyEventData from '../events/zooyeventdata.js';
import EVT from './evt.js';
import { UiEventType } from '../events/uieventtype.js'
import { removeNode, isInPage } from '../dom/utils.js';


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


export default class Component extends EVT {

  //----------------------------------------------------------------[ Static ]--
  static compEventCode() {
    return UiEventType.COMP;
  }

  static compReadyCode() {
    return UiEventType.READY;
  }

  constructor() {
    super();

    /**
     * A function that returns a newly minted element.
     * @return {!HTMLElement|!Element|!DocumentFragment}
     * @private
     */
    this.makeDomFunc_ = () =>
        /** @type {!HTMLElement} */(document.createElement('div'));


    /**
     * Whether the component is in the document.
     * @private {boolean}
     */
    this.inDocument_ = false;

    /**
     * The DOM element for the component.
     * @private {!Node|undefined}
     */
    this.element_ =  void 0;

    /**
     * Arbitrary data object associated with the component.  Such as meta-data.
     * @private {*}
     */
    this.model_ = void 0;

    /**
     * A DOM element where this component will be rendered to.
     * This does not need to be an element in this component's parent DOM.
     * @private {Element|undefined}
     */
    this.target_ = void 0;

    /**
     * Parent component to which events will be propagated.  This property is
     * strictly private and must not be accessed directly outside of this class!
     * @private {Component|undefined}
     */
    this.parent_ = void 0;

    /**
     * A map of child components.  Lazily initialized on first use.  Must be
     * kept in sync with `childIndex_`.  This property is strictly private and
     * must not be accessed directly outside of this class!
     * @private {Map<string, Component>?}
     */
    this.children_ = new Map();

    /**
     * A function guaranteed to be called before the component ready
     * event is fired.
     * @type {!Function}
     * @private
     */
    this.beforeReadyFunc_ = () => void 0;

  };

  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * @param {Element|undefined} e
   */
  set target(e) {
    this.target_ = e;
  }

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
   * @param {!function():(!HTMLElement|!Element|!DocumentFragment)} func
   */
  set domFunc(func) {
    this.makeDomFunc_ = func;
  }

  /**
   * @param {!Function} func A callback guaranteed to fire after the panels is
   * ready, and in the document, but before the
   * {@code UiEventType.READY} event is fired.
   */
  set readyFunc(func) {
    this.beforeReadyFunc_ = func;
  }


  //--------------------------------------------------------[ DOM Management ]--
  setElementInternal_(frag) {
    this.element_ = frag;
  }

  /**
   * Gets the component's element.
   * @return {!Node|undefined} The element
   *    for the component.
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
    const rootEl = /** @type {!Node} */(this.element_);

    if (opt_target) {
      this.target_ = opt_target;
    }

    if (this.target_) {
      if (!isInPage(rootEl)) {
        this.target_.insertBefore(rootEl, null);
      }
    } else {
      if (!isInPage(/** @type {!Node} */(rootEl))) {
        document.body.appendChild(rootEl);
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
    removeNode(this.getElement());
  };


  /**
   * Disposes of the component.  Calls `exitDocument`, which is expected to
   * remove event handlers and clean up the component.  Propagates the call to
   * the component's children, if any. Removes the component's DOM from the
   * document unless it was decorated.
   * @protected
   */
  disposeInternal() {

    if (this.isInDocument) {
      this.exitDocument();
    }

    // Disposes of the component's children, if any.
    if (this.children_) {
      [...this.children_.values()].forEach(child => child.disposeInternal());
    }

    // Detach the component's element from the DOM, unless it was decorated.
    if (this.element_) {
      removeNode(this.element_);
    }

    this.children_ = null;
    this.element_ = void 0;
    this.model_ = null;
    this.parent_ = null;

    super.disposeInternal();
  };

  dispose() {
    const me = this.getElement();
    if (me) {
      const els = this.getElement().querySelectorAll("[data-mdc-auto-init]");
      [...els].forEach(e => {
        try {
          e[e.getAttribute('data-mdc-auto-init')].destroy();
        } catch (e) {
          // do nothing...
        }

      });
    }
    super.dispose();
  }


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
    const dataObj = new ZooyEventData(value, opt_data);
    const event = EVT.makeEvent(UiEventType.COMP, dataObj);
    return this.dispatchEvent(event);
  };

}