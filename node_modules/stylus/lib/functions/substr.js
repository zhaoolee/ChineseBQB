var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Returns substring of the given `val`.
 *
 * @param {String|Ident} val
 * @param {Number} start
 * @param {Number} [length]
 * @return {String|Ident}
 * @api public
 */

module.exports = function substr(val, start, length){
  utils.assertString(val, 'val');
  utils.assertType(start, 'unit', 'start');
  length = length && length.val;
  var res = val.string.substr(start.val, length);
  return val instanceof nodes.Ident
      ? new nodes.Ident(res)
      : new nodes.String(res);
};
