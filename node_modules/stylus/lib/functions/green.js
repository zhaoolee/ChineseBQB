var nodes = require('../nodes')
  , rgba = require('./rgba');

/**
 * Return the green component of the given `color`,
 * or set the green component to the optional second `value` argument.
 *
 * Examples:
 *
 *    green(#0c0)
 *    // => 204
 *
 *    green(#000, 255)
 *    // => #0f0
 *
 * @param {RGBA|HSLA} color
 * @param {Unit} [value]
 * @return {Unit|RGBA}
 * @api public
 */

module.exports = function green(color, value){
  color = color.rgba;
  if (value) {
    return rgba(
      new nodes.Unit(color.r),
      value,
      new nodes.Unit(color.b),
      new nodes.Unit(color.a)
    );
  }
  return new nodes.Unit(color.g, '');
};
