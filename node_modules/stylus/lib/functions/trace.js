var nodes = require('../nodes');

/**
 * Output stack trace.
 *
 * @api public
 */

module.exports = function trace(){
  console.log(this.stack);
  return nodes.null;
};
