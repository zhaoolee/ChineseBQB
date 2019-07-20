var utils = require('../utils'),
    nodes = require('../nodes');

/**
 * This is a heler function for the slice method
 *
 * @param {String|Ident} vals
 * @param {Unit} start [0]
 * @param {Unit} end [vals.length]
 * @return {String|Literal|Null}
 * @api public
*/
(module.exports = function slice(val, start, end) {
  start = start && start.nodes[0].val;
  end = end && end.nodes[0].val;

  val = utils.unwrap(val).nodes;

  if (val.length > 1) {
    return utils.coerce(val.slice(start, end), true);
  }

  var result = val[0].string.slice(start, end);

  return val[0] instanceof nodes.Ident
    ? new nodes.Ident(result)
    : new nodes.String(result);
}).raw = true;
