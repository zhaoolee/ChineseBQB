var path = require('path');

/**
 * Peform a path join.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

(module.exports = function pathjoin(){
  var paths = [].slice.call(arguments).map(function(path){
    return path.first.string;
  });
  return path.join.apply(null, paths).replace(/\\/g, '/');
}).raw = true;
