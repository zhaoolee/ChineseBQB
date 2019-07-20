var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Set a variable `name` on current scope.
 *
 * @param {String} name
 * @param {Expression} expr
 * @param {Boolean} [global]
 * @api public
 */

module.exports = function define(name, expr, global){
  utils.assertType(name, 'string', 'name');
  expr = utils.unwrap(expr);
  var scope = this.currentScope;
  if (global && global.toBoolean().isTrue) {
    scope = this.global.scope;
  }
  var node = new nodes.Ident(name.val, expr);
  scope.add(node);
  return nodes.null;
};
