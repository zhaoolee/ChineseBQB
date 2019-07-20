/**
 * Module dependencies.
 */

var crypto = require('crypto')
  , fs = require('fs')
  , join = require('path').join
  , version = require('../../package').version
  , nodes = require('../nodes');

var FSCache = module.exports = function(options) {
  options = options || {};
  this._location = options['cache location'] || '.styl-cache';
  if (!fs.existsSync(this._location)) fs.mkdirSync(this._location);
};

/**
 * Set cache item with given `key` to `value`.
 *
 * @param {String} key
 * @param {Object} value
 * @api private
 */

FSCache.prototype.set = function(key, value) {
  fs.writeFileSync(join(this._location, key), JSON.stringify(value));
};

/**
 * Get cache item with given `key`.
 *
 * @param {String} key
 * @return {Object}
 * @api private
 */

FSCache.prototype.get = function(key) {
  var data = fs.readFileSync(join(this._location, key), 'utf-8');
  return JSON.parse(data, FSCache.fromJSON);
};

/**
 * Check if cache has given `key`.
 *
 * @param {String} key
 * @return {Boolean}
 * @api private
 */

FSCache.prototype.has = function(key) {
  return fs.existsSync(join(this._location, key));
};

/**
 * Generate key for the source `str` with `options`.
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api private
 */

FSCache.prototype.key = function(str, options) {
  var hash = crypto.createHash('sha1');
  hash.update(str + version + options.prefix);
  return hash.digest('hex');
};

/**
 * JSON to Stylus nodes converter.
 *
 * @api private
 */

FSCache.fromJSON = function(key, val) {
  if (val && val.__type) {
    val.__proto__ = nodes[val.__type].prototype;
  }
  return val;
};
