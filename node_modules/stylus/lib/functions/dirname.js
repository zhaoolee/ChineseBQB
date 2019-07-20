var utils = require('../utils')
  , path = require('path');

/**
 * Return the dirname of `path`.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

module.exports = function dirname(p){
  utils.assertString(p, 'path');
  return path.dirname(p.val).replace(/\\/g, '/');
};
