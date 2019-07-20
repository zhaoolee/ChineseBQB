/**
 * Module dependencies.
 */

var Compiler = require('../visitor/compiler')
  , nodes = require('../nodes')
  , parse = require('url').parse
  , relative = require('path').relative
  , join = require('path').join
  , dirname = require('path').dirname
  , extname = require('path').extname
  , sep = require('path').sep;

/**
 * Return a url() function which resolves urls.
 *
 * Options:
 *
 *    - `paths` resolution path(s), merged with general lookup paths
 *    - `nocheck` don't check file existence
 *
 * Examples:
 *
 *    stylus(str)
 *      .set('filename', __dirname + '/css/test.styl')
 *      .define('url', stylus.resolver({ nocheck: true }))
 *      .render(function(err, css){ ... })
 *
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

module.exports = function(options) {
  options = options || {};

  function resolver(url) {
    // Compile the url
    var compiler = new Compiler(url)
      , filename = url.filename;
    compiler.isURL = true;
    url = parse(url.nodes.map(function(node){
      return compiler.visit(node);
    }).join(''));

    // Parse literal 
    var literal = new nodes.Literal('url("' + url.href + '")')
      , path = url.pathname
      , dest = this.options.dest
      , tail = ''
      , res;

    // Absolute or hash
    if (url.protocol || !path || '/' == path[0]) return literal;

    // Check that file exists
    if (!options.nocheck) {
      var _paths = options.paths || [];
      path = require('../utils').lookup(path, _paths.concat(this.paths));
      if (!path) return literal;
    }

    if (this.includeCSS && extname(path) == '.css')
      return new nodes.Literal(url.href);

    if (url.search) tail += url.search;
    if (url.hash) tail += url.hash;

    if (dest && extname(dest) == '.css')
      dest = dirname(dest);

    res = relative(dest || dirname(this.filename), options.nocheck
      ? join(dirname(filename), path)
      : path) + tail;

    if ('\\' == sep) res = res.replace(/\\/g, '/');

    return new nodes.Literal('url("' + res + '")');
  };

  // Expose options to Evaluator
  resolver.options = options;
  resolver.raw = true;
  return resolver;
};
