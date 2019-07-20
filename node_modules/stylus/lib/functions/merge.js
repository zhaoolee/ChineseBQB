var utils = require('../utils');

/**
 * Merge the object `dest` with the given args.
 *
 * @param {Object} dest
 * @param {Object} ...
 * @return {Object} dest
 * @api public
 */

(module.exports = function merge(dest){
  utils.assertPresent(dest, 'dest');
  dest = utils.unwrap(dest).first;
  utils.assertType(dest, 'object', 'dest');

  var last = utils.unwrap(arguments[arguments.length - 1]).first
    , deep = (true === last.val);

  for (var i = 1, len = arguments.length - deep; i < len; ++i) {
    utils.merge(dest.vals, utils.unwrap(arguments[i]).first.vals, deep);
  }
  return dest;
}).raw = true;
