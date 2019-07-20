var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Return the opposites of the given `positions`.
 *
 * Examples:
 *
 *    opposite-position(top left)
 *    // => bottom right
 *
 * @param {Expression} positions
 * @return {Expression}
 * @api public
 */

(module.exports = function oppositePosition(positions){
  var expr = [];
  utils.unwrap(positions).nodes.forEach(function(pos, i){
    utils.assertString(pos, 'position ' + i);
    pos = (function(){ switch (pos.string) {
      case 'top': return 'bottom';
      case 'bottom': return 'top';
      case 'left': return 'right';
      case 'right': return 'left';
      case 'center': return 'center';
      default: throw new Error('invalid position ' + pos);
    }})();
    expr.push(new nodes.Literal(pos));
  });
  return expr;
}).raw = true;
