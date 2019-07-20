var nodes = require('../nodes')
  , Parser = require('../selector-parser');

/**
 * Return a list with raw selectors parts
 * of the current group.
 *
 * For example:
 *
 *    .a, .b
 *      .c
 *        .d
 *          test: selectors() // => '.a,.b', '& .c', '& .d'
 *
 * @return {Expression}
 * @api public
 */

module.exports = function selectors(){
  var stack = this.selectorStack
    , expr = new nodes.Expression(true);

  if (stack.length) {
    for (var i = 0; i < stack.length; i++) {
      var group = stack[i]
        , nested;

      if (group.length > 1) {
        expr.push(new nodes.String(group.map(function(selector) {
          nested = new Parser(selector.val).parse().nested;
          return (nested && i ? '& ' : '') + selector.val;
        }).join(',')))
      } else {
        var selector = group[0].val
        nested = new Parser(selector).parse().nested;
        expr.push(new nodes.String((nested && i ? '& ' : '') + selector));
      }
    }
  } else {
    expr.push(new nodes.String('&'));
  }
  return expr;
};
