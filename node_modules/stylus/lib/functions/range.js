var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Returns a list of units from `start` to `stop`
 * by `step`. If `step` argument is omitted,
 * it defaults to 1.
 *
 * @param {Unit} start
 * @param {Unit} stop
 * @param {Unit} [step]
 * @return {Expression}
 * @api public
 */

module.exports = function range(start, stop, step){
  utils.assertType(start, 'unit', 'start');
  utils.assertType(stop, 'unit', 'stop');
  if (step) {
    utils.assertType(step, 'unit', 'step');
    if (0 == step.val) {
      throw new Error('ArgumentError: "step" argument must not be zero');
    }
  } else {
    step = new nodes.Unit(1);
  }
  var list = new nodes.Expression;
  for (var i = start.val; i <= stop.val; i += step.val) {
    list.push(new nodes.Unit(i, start.type));
  }
  return list;
};
