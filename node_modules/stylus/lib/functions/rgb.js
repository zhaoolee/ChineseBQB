var utils = require('../utils')
  , nodes = require('../nodes')
  , rgba = require('./rgba');

/**
 * Return a `RGBA` from the r,g,b channels.
 *
 * Examples:
 *
 *    rgb(255,204,0)
 *    // => #ffcc00
 *
 *    rgb(#fff)
 *    // => #fff
 *
 * @param {Unit|RGBA|HSLA} red
 * @param {Unit} green
 * @param {Unit} blue
 * @return {RGBA}
 * @api public
 */

module.exports = function rgb(red, green, blue){
  switch (arguments.length) {
    case 1:
      utils.assertColor(red);
      var color = red.rgba;
      return new nodes.RGBA(
          color.r
        , color.g
        , color.b
        , 1);
    default:
      return rgba(
          red
        , green
        , blue
        , new nodes.Unit(1));
  }
};
