//--------------------------------------------[ Standard component event data]--
export default class ZooyEventData {

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
