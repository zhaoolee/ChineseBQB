var utils = require('../utils')
  , path = require('path');

/**
 * Return the basename of `path`.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

module.exports = function basename(p, ext){
  utils.assertString(p, 'path');
  return path.basename(p.val, ext && ext.val);
};
