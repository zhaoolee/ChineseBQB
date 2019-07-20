var utils = require('../utils');

/**
 * Shift an element from `expr`.
 *
 * @param {Expression} expr
 * @return {Node}
 * @api public
 */

 (module.exports = function(expr){
   expr = utils.unwrap(expr);
   return expr.nodes.shift();
 }).raw = true;

