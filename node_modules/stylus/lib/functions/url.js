
/*!
 * Stylus - plugin - url
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Compiler = require('../visitor/compiler')
  , events = require('../renderer').events
  , nodes = require('../nodes')
  , parse = require('url').parse
  , extname = require('path').extname
  , utils = require('../utils')
  , fs = require('fs');

/**
 * Mime table.
 */

var defaultMimes = {
    '.gif': 'image/gif'
  , '.png': 'image/png'
  , '.jpg': 'image/jpeg'
  , '.jpeg': 'image/jpeg'
  , '.svg': 'image/svg+xml'
  , '.webp': 'image/webp'
  , '.ttf': 'application/x-font-ttf'
  , '.eot': 'application/vnd.ms-fontobject'
  , '.woff': 'application/font-woff'
  , '.woff2': 'application/font-woff2'
};

/**
 * Supported encoding types
 */
var encodingTypes = {
  BASE_64: 'base64',
  UTF8: 'charset=utf-8'
}

/**
 * Return a url() function with the given `options`.
 *
 * Options:
 *
 *    - `limit` bytesize limit defaulting to 30Kb
 *    - `paths` image resolution path(s), merged with general lookup paths
 *
 * Examples:
 *
 *    stylus(str)
 *      .set('filename', __dirname + '/css/test.styl')
 *      .define('url', stylus.url({ paths: [__dirname + '/public'] }))
 *      .render(function(err, css){ ... })
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function(options) {
  options = options || {};

  var _paths = options.paths || [];
  var sizeLimit = null != options.limit ? options.limit : 30000;
  var mimes = options.mimes || defaultMimes;

  /**
   * @param {object} url - The path to the image you want to encode.
   * @param {object} enc - The encoding for the image. Defaults to base64, the 
   * other valid option is `utf8`.
   */
  function fn(url, enc){
    // Compile the url
    var compiler = new Compiler(url)
      , encoding = encodingTypes.BASE_64;

    compiler.isURL = true;
    url = url.nodes.map(function(node){
      return compiler.visit(node);
    }).join('');

    // Parse literal
    url = parse(url);
    var ext = extname(url.pathname)
      , mime = mimes[ext]
      , hash = url.hash || ''
      , literal = new nodes.Literal('url("' + url.href + '")')
      , paths = _paths.concat(this.paths)
      , buf
      , result;

    // Not supported
    if (!mime) return literal;

    // Absolute
    if (url.protocol) return literal;

    // Lookup
    var found = utils.lookup(url.pathname, paths);

    // Failed to lookup
    if (!found) {
      events.emit(
          'file not found'
        , 'File ' + literal + ' could not be found, literal url retained!'
      );

      return literal;
    }

    // Read data
    buf = fs.readFileSync(found);

    // Too large
    if (false !== sizeLimit && buf.length > sizeLimit) return literal;

    if (enc && 'utf8' == enc.first.val.toLowerCase()) {
      encoding = encodingTypes.UTF8;
      result = buf.toString('utf8').replace(/\s+/g, ' ')
        .replace(/[{}\|\\\^~\[\]`"<>#%]/g, function(match) {
          return '%' + match[0].charCodeAt(0).toString(16).toUpperCase();
        }).trim();
    } else {
      result = buf.toString(encoding) + hash;
    }

    // Encode
    return new nodes.Literal('url("data:' + mime + ';' +  encoding + ',' + result + '")');
  };

  fn.raw = true;
  return fn;
};

// Exporting default mimes so we could easily access them
module.exports.mimes = defaultMimes;

