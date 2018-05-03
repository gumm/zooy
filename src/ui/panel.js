import Component from './component.js';


class Panel extends Component {

  
  constructor(uri) {
    super();
    
    this.uri_ = uri
  };

  //---------------------------------------------------[ Getters and Setters ]--
  get uri() {
    return this.uri_;
  }


  //----------------------------------------------------------------------------
  /**
   * Expects HTML data from a call to the back.
   * @param {Function=} opt_callback An optional callback to call before rendering
   * the panel. This is useful for when you only want to attach the new panel to
   * the view right before you render it - meaning the existing panel stays in
   * place on the DOM for the duration of the fetch call.
   * @return {Promise} Returns a promise with this panel as value.
   */
  renderWithTemplate(opt_callback) {
    return fetch(this.uri)
        .then(response => response.text())
        .then(domString => {
          this.domFunc = () => document.createRange()
              .createContextualFragment(domString);
          this.render();
        })
  };


}


export default Panel;