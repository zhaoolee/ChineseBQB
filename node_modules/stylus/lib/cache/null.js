/**
 * Module dependencies.
 */

var NullCache = module.exports = function() {};

/**
 * Set cache item with given `key` to `value`.
 *
 * @param {String} key
 * @param {Object} value
 * @api private
 */

NullCache.prototype.set = function(key, value) {};

/**
 * Get cache item with given `key`.
 *
 * @param {String} key
 * @return {Object}
 * @api private
 */

NullCache.prototype.get = function(key) {};

/**
 * Check if cache has given `key`.
 *
 * @param {String} key
 * @return {Boolean}
 * @api private
 */

NullCache.prototype.has = function(key) {
  return false;
};

/**
 * Generate key for the source `str` with `options`.
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api private
 */

NullCache.prototype.key = function(str, options) {
  return '';
};
