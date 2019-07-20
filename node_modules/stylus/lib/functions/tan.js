var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Return the tangent of the given `angle`.
 *
 * @param {Unit} angle
 * @return {Unit}
 * @api public
 */

module.exports = function tan(angle) {
  utils.assertType(angle, 'unit', 'angle');

  var radians = angle.val;

  if (angle.type === 'deg') {
    radians *= Math.PI / 180;
  }

  var m = Math.pow(10, 9);

  var sin = Math.round(Math.sin(radians) * m) / m
    , cos = Math.round(Math.cos(radians) * m) / m
    , tan = Math.round(m * sin / cos ) / m;

  return new nodes.Unit(tan, '');
};
