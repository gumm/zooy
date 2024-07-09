
/**
 * A regular expression for breaking a URI into its component parts.
 *
 * {@link http://www.ietf.org/rfc/rfc3986.txt} says in Appendix B
 * As the "first-match-wins" algorithm is identical to the "greedy"
 * disambiguation method used by POSIX regular expressions, it is natural and
 * commonplace to use a regular expression for parsing the potential five
 * components of a URI reference.
 *
 * The following line is the regular expression for breaking-down a
 * well-formed URI reference into its components.
 *
 * <pre>
 * ^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?
 *  12            3  4          5       6  7        8 9
 * </pre>
 *
 * The numbers in the second line above are only to assist readability; they
 * indicate the reference points for each subexpression (i.e., each paired
 * parenthesis). We refer to the value matched for subexpression <n> as $<n>.
 * For example, matching the above expression to
 * <pre>
 *     http://www.ics.uci.edu/pub/ietf/uri/#Related
 * </pre>
 * results in the following subexpression matches:
 * <pre>
 *    $1 = http:
 *    $2 = http
 *    $3 = //www.ics.uci.edu
 *    $4 = www.ics.uci.edu
 *    $5 = /pub/ietf/uri/
 *    $6 = <undefined>
 *    $7 = <undefined>
 *    $8 = #Related
 *    $9 = Related
 * </pre>
 * where <undefined> indicates that the component is not present, as is the
 * case for the query component in the above example. Therefore, we can
 * determine the value of the five components as
 * <pre>
 *    scheme    = $2
 *    authority = $4
 *    path      = $5
 *    query     = $7
 *    fragment  = $9
 * </pre>
 *
 * The regular expression has been modified slightly to expose the
 * userInfo, domain, and port separately from the authority.
 * The modified version yields
 * <pre>
 *    $1 = http              scheme
 *    $2 = <undefined>       userInfo -\
 *    $3 = www.ics.uci.edu   domain     | authority
 *    $4 = <undefined>       port     -/
 *    $5 = /pub/ietf/uri/    path
 *    $6 = <undefined>       query without ?
 *    $7 = Related           fragment without #
 * </pre>
 * @type {!RegExp}
 * @private
 */
const splitRe_ = new RegExp(
  '^' +
  '(?:' +
  '([^:/?#.]+)' +  // scheme - ignore special characters
  // used by other URL parts such as :,
  // ?, /, #, and .
  ':)?' +
  '(?://' +
  '(?:([^/?#]*)@)?' +  // userInfo
  '([^/#?]*?)' +       // domain
  '(?::([0-9]+))?' +   // port
  '(?=[/#?]|$)' +      // authority-terminating character
  ')?' +
  '([^?#]+)?' +          // path
  '(?:\\?([^#]*))?' +    // query
  '(?:#([\\s\\S]*))?' +  // fragment
  '$');


/**
 * The index of each URI component in the return value of goog.uri.utils.split.
 * @enum {number}
 */
const ComponentIndex = {
  SCHEME: 1,
  USER_INFO: 2,
  DOMAIN: 3,
  PORT: 4,
  PATH: 5,
  QUERY_DATA: 6,
  FRAGMENT: 7
};


/**
 * Splits a URI into its component parts.
 *
 * Each component can be accessed via the component indices; for example:
 * <pre>
 * goog.uri.utils.split(someStr)[goog.uri.utils.ComponentIndex.QUERY_DATA];
 * </pre>
 *
 * @param {string} uri The URI string to examine.
 * @return {!Array<string|undefined>} Each component still URI-encoded.
 *     Each component that is present will contain the encoded value, whereas
 *     components that are not present will be undefined or empty, depending
 *     on the browser's regular expression implementation.  Never null, since
 *     arbitrary strings may still look like path names.
 */
const split = uri => {
  // See @return comment -- never null.
  return /** @type {!Array<string|undefined>} */ (
    uri.match(splitRe_));
};


/**
 * Decodes a value or returns the empty string if it isn't defined or empty.
 * @throws URIError If decodeURIComponent fails to decode val.
 * @param {string|undefined} val Value to decode.
 * @param {boolean=} opt_preserveReserved If true, restricted characters will
 *     not be decoded.
 * @return {string} Decoded value.
 * @private
 */
const decodeOrEmpty_ = (val, opt_preserveReserved) => {
  // Don't use UrlDecode() here because val is not a query parameter.
  if (!val) {
    return '';
  }

  // decodeURI has the same output for '%2f' and '%252f'. We double encode %25
  // so that we can distinguish between the 2 inputs. This is later undone by
  // removeDoubleEncoding_.
  return opt_preserveReserved ? decodeURI(val.replace(/%25/g, '%2525')) :
    decodeURIComponent(val);
};


const getPath = uri => decodeOrEmpty_(split(uri)[ComponentIndex.PATH], true);

const getQueryData = uri => decodeOrEmpty_(split(uri)[ComponentIndex.QUERY_DATA], true);

const objectToUrlParms = obj => [...Object.entries(obj)].map(
  e => `${e[0]}=${e[1]}`).join('&');


const isValidValue = t => t != null && t !== "";

const queryDataToMap = qString => qString.split('&').reduce((p, c) => {
  const [k, v] = c.split("=");
  if (isValidValue(k) && isValidValue(v)) {
    p.set(k,v);
  }
  return p;
}, new Map());

export {
  objectToUrlParms,
  getPath,
  getQueryData,
  queryDataToMap,
}
