var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Convert the given `color` to an `HSLA` node,
 * or h,s,l,a component values.
 *
 * Examples:
 *
 *    hsla(10deg, 50%, 30%, 0.5)
 *    // => HSLA
 *
 *    hsla(#ffcc00)
 *    // => HSLA
 *
 * @param {RGBA|HSLA|Unit} hue
 * @param {Unit} saturation
 * @param {Unit} lightness
 * @param {Unit} alpha
 * @return {HSLA}
 * @api public
 */

module.exports = function hsla(hue, saturation, lightness, alpha){
  switch (arguments.length) {
    case 1:
      utils.assertColor(hue);
      return hue.hsla;
    case 2:
      utils.assertColor(hue);
      var color = hue.hsla;
      utils.assertType(saturation, 'unit', 'alpha');
      var alpha = saturation.clone();
      if ('%' == alpha.type) alpha.val /= 100;
      return new nodes.HSLA(
          color.h
        , color.s
        , color.l
        , alpha.val);
    default:
      utils.assertType(hue, 'unit', 'hue');
      utils.assertType(saturation, 'unit', 'saturation');
      utils.assertType(lightness, 'unit', 'lightness');
      utils.assertType(alpha, 'unit', 'alpha');
      var alpha = alpha.clone();
      if (alpha && '%' == alpha.type) alpha.val /= 100;
      return new nodes.HSLA(
          hue.val
        , saturation.val
        , lightness.val
        , alpha.val);
  }
};
