var nodes = require('../nodes');

/**
 * Get Math `prop`.
 *
 * @param {String} prop
 * @return {Unit}
 * @api private
 */

module.exports = function math(prop){
  return new nodes.Unit(Math[prop.string]);
};
