var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Lookup variable `name` or return Null.
 *
 * @param {String} name
 * @return {Mixed}
 * @api public
 */

module.exports = function lookup(name){
  utils.assertType(name, 'string', 'name');
  var node = this.lookup(name.val);
  if (!node) return nodes.null;
  return this.visit(node);
};
