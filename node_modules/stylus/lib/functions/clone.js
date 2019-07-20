var utils = require('../utils');

/**
 * Return a clone of the given `expr`.
 *
 * @param {Expression} expr
 * @return {Node}
 * @api public
 */

(module.exports = function clone(expr){
  utils.assertPresent(expr, 'expr');
  return expr.clone();
}).raw = true;
