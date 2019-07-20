var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Unquote the given `string`.
 *
 * Examples:
 *
 *    unquote("sans-serif")
 *    // => sans-serif
 *
 *    unquote(sans-serif)
 *    // => sans-serif
 *
 * @param {String|Ident} string
 * @return {Literal}
 * @api public
 */

module.exports = function unquote(string){
  utils.assertString(string, 'string');
  return new nodes.Literal(string.string);
};
