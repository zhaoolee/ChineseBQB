var utils = require('../utils');

/**
 * Remove the given `key` from the `object`.
 *
 * @param {Object} object
 * @param {String} key
 * @return {Object}
 * @api public
 */

module.exports = function remove(object, key){
  utils.assertType(object, 'object', 'object');
  utils.assertString(key, 'key');
  delete object.vals[key.string];
  return object;
};
