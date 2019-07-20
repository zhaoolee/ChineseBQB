var utils = require('../utils');

/**
 * Pop a value from `expr`.
 *
 * @param {Expression} expr
 * @return {Node}
 * @api public
 */

(module.exports = function pop(expr) {
  expr = utils.unwrap(expr);
  return expr.nodes.pop();
}).raw = true;
