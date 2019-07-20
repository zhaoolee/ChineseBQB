var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Blend the `top` color over the `bottom`
 *
 * Examples:
 *
 *     blend(rgba(#FFF, 0.5), #000)
 *     // => #808080
 * 
 *     blend(rgba(#FFDE00,.42), #19C261)
 *     // => #7ace38
 * 
 *     blend(rgba(lime, 0.5), rgba(red, 0.25))
 *     // => rgba(128,128,0,0.625)
 *
 * @param {RGBA|HSLA} top
 * @param {RGBA|HSLA} [bottom=#fff]
 * @return {RGBA}
 * @api public
 */

module.exports = function blend(top, bottom){
  // TODO: different blend modes like overlay etc.
  utils.assertColor(top);
  top = top.rgba;
  bottom = bottom || new nodes.RGBA(255, 255, 255, 1);
  utils.assertColor(bottom);
  bottom = bottom.rgba;

  return new nodes.RGBA(
    top.r * top.a + bottom.r * (1 - top.a),
    top.g * top.a + bottom.g * (1 - top.a),
    top.b * top.a + bottom.b * (1 - top.a),
    top.a + bottom.a - top.a * bottom.a);
};
