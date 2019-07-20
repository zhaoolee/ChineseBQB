var utils = require('../utils');

/**
 * Return the current selector or compile
 * selector from a string or a list.
 *
 * @param {String|Expression}
 * @return {String}
 * @api public
 */

(module.exports = function selector(){
  var stack = this.selectorStack
    , args = [].slice.call(arguments);

  if (1 == args.length) {
    var expr = utils.unwrap(args[0])
      , len = expr.nodes.length;

    // selector('.a')
    if (1 == len) {
      utils.assertString(expr.first, 'selector');
      var SelectorParser = require('../selector-parser')
        , val = expr.first.string
        , parsed = new SelectorParser(val).parse().val;

      if (parsed == val) return val;

      stack.push(parse(val));
    } else if (len > 1) {
      // selector-list = '.a', '.b', '.c'
      // selector(selector-list)
      if (expr.isList) {
        pushToStack(expr.nodes, stack);
      // selector('.a' '.b' '.c')
      } else {
        stack.push(parse(expr.nodes.map(function(node){
          utils.assertString(node, 'selector');
          return node.string;
        }).join(' ')));
      }
    }
  // selector('.a', '.b', '.c')
  } else if (args.length > 1) {
    pushToStack(args, stack);
  }

  return stack.length ? utils.compileSelectors(stack).join(',') : '&';
}).raw = true;

function pushToStack(selectors, stack) {
  selectors.forEach(function(sel) {
    sel = sel.first;
    utils.assertString(sel, 'selector');
    stack.push(parse(sel.string));
  });
}

function parse(selector) {
  var Parser = new require('../parser')
    , parser = new Parser(selector)
    , nodes;
  parser.state.push('selector-parts');
  nodes = parser.selector();
  nodes.forEach(function(node) {
    node.val = node.segments.map(function(seg){
      return seg.toString();
    }).join('');
  });
  return nodes;
}
