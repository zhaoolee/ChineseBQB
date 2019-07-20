var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Inspect the given `expr`.
 *
 * @param {Expression} expr
 * @api public
 */

(module.exports = function p(){
  [].slice.call(arguments).forEach(function(expr){
    expr = utils.unwrap(expr);
    if (!expr.nodes.length) return;
    console.log('\u001b[90minspect:\u001b[0m %s', expr.toString().replace(/^\(|\)$/g, ''));
  })
  return nodes.null;
}).raw = true;
