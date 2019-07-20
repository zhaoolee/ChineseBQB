var utils = require('../utils')
  , nodes = require('../nodes');

var VALID_FLAGS = 'igm';

/**
 * retrieves the matches when matching a `val`(string)
 * against a `pattern`(regular expression).
 *
 * Examples:
 *   $regex = '^(height|width)?([<>=]{1,})(.*)'
 *
 *   match($regex,'height>=sm')
 * 	 // => ('height>=sm' 'height' '>=' 'sm')
 * 	 // => also truthy
 *
 *   match($regex, 'lorem ipsum')
 *   // => null
 *
 * @param {String} pattern
 * @param {String|Ident} val
 * @param {String|Ident} [flags='']
 * @return {String|Null}
 * @api public
 */

module.exports = function match(pattern, val, flags){
  utils.assertType(pattern, 'string', 'pattern');
  utils.assertString(val, 'val');
  var re = new RegExp(pattern.val, validateFlags(flags) ? flags.string : '');
  return val.string.match(re);
};

function validateFlags(flags) {
  flags = flags && flags.string;

  if (flags) {
    return flags.split('').every(function(flag) {
      return ~VALID_FLAGS.indexOf(flag);
    });
  }
  return false;
}
