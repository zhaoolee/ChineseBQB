var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Assign `type` to the given `unit` or return `unit`'s type.
 *
 * @param {Unit} unit
 * @param {String|Ident} type
 * @return {Unit}
 * @api public
 */

module.exports = function unit(unit, type){
  utils.assertType(unit, 'unit', 'unit');

  // Assign
  if (type) {
    utils.assertString(type, 'type');
    return new nodes.Unit(unit.val, type.string);
  } else {
    return unit.type || '';
  }
};
