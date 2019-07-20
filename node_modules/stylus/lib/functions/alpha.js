var nodes = require('../nodes')
  , rgba = require('./rgba');

/**
 * Return the alpha component of the given `color`,
 * or set the alpha component to the optional second `value` argument.
 *
 * Examples:
 *
 *    alpha(#fff)
 *    // => 1
 *
 *    alpha(rgba(0,0,0,0.3))
 *    // => 0.3
 *
 *    alpha(#fff, 0.5)
 *    // => rgba(255,255,255,0.5)
 *
 * @param {RGBA|HSLA} color
 * @param {Unit} [value]
 * @return {Unit|RGBA}
 * @api public
 */

module.exports = function alpha(color, value){
  color = color.rgba;
  if (value) {
    return rgba(
      new nodes.Unit(color.r),
      new nodes.Unit(color.g),
      new nodes.Unit(color.b),
      value
    );
  }
  return new nodes.Unit(color.a, '');
};
