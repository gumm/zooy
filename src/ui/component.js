import ZooyEventData from '../events/zooyeventdata.js';
import EVT from './evt.js';
import {UiEventType} from '../events/uieventtype.js';
import {isInPage, removeNode} from '../dom/utils.js';


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
   * Error when an already disposed component is attempted to be rendered.
   */
  ALREADY_DISPOSED: 'Component already disposed',

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

/**
 * Base UI component class that provides lifecycle management, DOM manipulation,
 * and a parent-child component hierarchy. Components can be rendered into the DOM,
 * manage their own children, and dispatch events to communicate with other components.
 *
 * @extends {EVT}
 */
export default class Component extends EVT {

  //----------------------------------------------------------------[ Static ]--
  /**
   * Returns the component event type code used for dispatching component events.
   * @return {string} The COMP event type
   */
  static compEventCode() {
    return UiEventType.COMP;
  }

  /**
   * Returns the component ready event type code.
   * @return {string} The READY event type
   */
  static compReadyCode() {
    return UiEventType.READY;
  }

  /**
   * Returns the component error enumeration object.
   * @return {!Object<string, string>} The ComponentError enum
   */
  static compErrors() {
    return ComponentError;
  }

  #makeDomFunc;
  #inDocument;
  #element;
  #model;
  #target;
  #parent;
  #children;
  #beforeReadyFunc;

  constructor() {
    super();

    /**
     * A function that returns a newly minted element.
     * @return {!HTMLElement|!Element|!DocumentFragment}
     * @private
     */
    this.#makeDomFunc = () =>
    /** @type {!HTMLElement} */(document.createElement('div'));


    /**
     * Whether the component is in the document.
     * @private {boolean}
     */
    this.#inDocument = false;

    /**
     * The DOM element for the component.
     * @private {!Node|undefined}
     */
    this.#element =  void 0;

    /**
     * Arbitrary data object associated with the component.  Such as meta-data.
     * @private {*}
     */
    this.#model = void 0;

    /**
     * A DOM element where this component will be rendered to.
     * This does not need to be an element in this component's parent DOM.
     * @private {Element|undefined}
     */
    this.#target = void 0;

    /**
     * Parent component to which events will be propagated.  This property is
     * strictly private and must not be accessed directly outside of this class!
     * @private {Component|undefined}
     */
    this.#parent = void 0;

    /**
     * A map of child components.  Lazily initialized on first use.  Must be
     * kept in sync with `childIndex_`.  This property is strictly private and
     * must not be accessed directly outside of this class!
     * @private {Map<string, Component>}
     */
    this.#children = new Map();


    /**
     * Dom Elements that are out of the direct tree of this component's element,
     * but still belongs to the component. These may be things like menu
     * surfaces that got hoisted to the document root (to fix overflow issues)
     * and should be removed from the DOM when this component is removed from
     * the DOM.
     * @type {[Element]}
     */
    this.outOfTreeElements = [];


    /**
     * The DOM element for the component.
     * @private {!Node|undefined}
     */
    this.placeholderDom_ = void 0;

    /**
     * A function guaranteed to be called before the component ready
     * event is fired.
     * @type {!Function}
     * @private
     */
    this.#beforeReadyFunc = () => void 0;

  };

  //---------------------------------------------------[ Getters and Setters ]--
  /**
   * @param {Element|undefined} e
   */
  set target(e) {
    this.#target = e;
  }

  /**
   * @returns {Element|undefined}
   */
  get target() {
    return this.#target;
  }

  /**
   * Sets the model associated with the UI component.
   * @param {*} m
   */
  set model(m) {
    this.#model = m;
  }

  /**
   * Returns the model associated with the UI component.
   * @return {*}
   */
  get model() {
    return this.#model;
  }


  /**
   * @param {boolean} bool
   */
  set isInDocument(bool) {
    this.#inDocument = bool;
  }

  /**
   * @return {boolean}
   */
  get isInDocument() {
    return this.#inDocument;
  }

  /**
   * A function that makes a DOM element.
   * @param {!function():(!HTMLElement|!Element|!DocumentFragment)} func
   */
  set domFunc(func) {
    this.#makeDomFunc = func;
  }

  /**
   * @param {!Function} func A callback guaranteed to fire after the panels is
   * ready, and in the document, but before the
   * {@code UiEventType.READY} event is fired.
   */
  set readyFunc(func) {
    this.#beforeReadyFunc = func;
  }


  //--------------------------------------------------------[ DOM Management ]--
  /**
   * Internal method to set the component's root element. Used primarily during
   * rendering and re-rendering operations.
   * @param {!Node} frag The DOM node to set as this component's element
   * @private
   */
  setElementInternal_(frag) {
    this.#element = frag;
  }

  /**
   * Gets the component's element.
   * @return {!HTMLElement|undefined} The element
   *    for the component.
   */
  getElement() {
    return this.#element;
  };

  /**
   * Creates the initial DOM representation for the component.  The default
   * implementation is to set this.element_ = div.
   */
  createDom() {
    this.#element = this.#makeDomFunc();
  };

  /**
   * Asserts that this component can be rendered asynchronously.
   * Throws an error if the component has already been disposed.
   * Used by async rendering methods to validate component state.
   * @throws {Error} If the component is already disposed
   */
  assertCanRenderAsync() {
    if (this.disposed) {
      throw new Error(ComponentError.ALREADY_DISPOSED);
    }
  }


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
    if (this.disposed) {
      throw new Error(ComponentError.ALREADY_DISPOSED);
    }

    if (this.isInDocument) {
      throw new Error(ComponentError.ALREADY_RENDERED);
    }

    if (!this.#element) {
      this.createDom();
    }
    const rootEl = /** @type {!Node} */(this.#element);

    if (opt_target) {
      this.#target = opt_target;
    }

    this.placeholderDom_ && removeNode(this.placeholderDom_);

    if (this.#target) {
      if (!isInPage(rootEl)) {
        this.#target.insertBefore(rootEl, null);
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
    if (!this.#parent || this.#parent.isInDocument) {
      this.enterDocument();
    }
  };


  //------------------------------------------------------------[ Life-cycle ]--
  /**
   * @param {Node} el
   * @param {Node} targetParent
   */
  hoist(el, targetParent = undefined) {
    if (!targetParent) {
      targetParent = document.querySelector('body');
    }
    targetParent.appendChild(el);
    this.outOfTreeElements.push(el);
  }

  /**
   * Executes the beforeReady callback function if one was set.
   * Called automatically during enterDocument, before the READY event is dispatched.
   * Allows components to perform final setup operations once they're in the DOM.
   */
  executeBeforeReady() {
    this.#beforeReadyFunc();
  }

  /**
   * Called when the component's element is known to be in the document. Anything
   * using document.getElementById etc. should be done at this stage.
   *
   * If the component contains child components, this call is propagated to its
   * children.
   */
  enterDocument() {

    // First check if I am disposed. If so, don't enter the document.
    // This may happen on slow networks where the user clicks multiple times
    // and multiple queries are in flight...
    if (this.disposed) {
      removeNode(this.getElement());
    } else {

      this.isInDocument = true;

      // Propagate enterDocument to child components that have a DOM, if any.
      // If a child was decorated before entering the document its enterDocument
      // will be called here.
      [...this.#children.values()].forEach(child => {
        if (!child.isInDocument && child.getElement()) {
          child.enterDocument();
        }
      });

      this.executeBeforeReady();
      this.dispatchCompEvent(UiEventType.READY);
    }

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

    [...this.#children.values()].forEach(child => {
      if (child.isInDocument) {
        child.exitDocument();
      }
    });

    this.stopBeingListenedTo();
    this.removeAllListener();
    this.isInDocument = false;
    removeNode(this.getElement());
    this.placeholderDom_ && removeNode(this.placeholderDom_);
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
    if (this.#children) {
      [...this.#children.values()].forEach(child => child.disposeInternal());
    }

    this.outOfTreeElements.forEach(removeNode);

    // Detach the component's element from the DOM, unless it was decorated.
    this.#element && removeNode(this.#element);
    this.placeholderDom_ && removeNode(this.placeholderDom_);

    this.#children = null;
    this.#element = void 0;
    this.#model = null;
    this.#parent = null;

    super.disposeInternal();
  };

  /**
   * Disposes of the component and performs cleanup. Aborts any pending async
   * operations, destroys Material Design Components if present, and calls the
   * parent dispose method.
   * After calling this method, the component should not be used.
   */
  dispose() {
    this.abortController && this.abortController.abort();
    const me = this.getElement();
    if (me) {
      const els = me.querySelectorAll('[data-mdc-auto-init]');
      [...els].forEach(e => {
        try {
          e[e.getAttribute('data-mdc-auto-init')].destroy();
        } catch (error) {
          // Intentionally ignoring MDC cleanup errors during disposal
          console.debug('MDC cleanup error during component disposal (non-critical):', error);
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
