var utils = require('../utils')
  , nodes = require('../nodes');

/**
 * Warn with the given `msg` prefixed by "Warning: ".
 *
 * @param {String} msg
 * @api public
 */

module.exports = function warn(msg){
  utils.assertType(msg, 'string', 'msg');
  console.warn('Warning: %s', msg.val);
  return nodes.null;
};
