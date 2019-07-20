
/*!
 * Stylus - utils
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var nodes = require('./nodes')
  , basename = require('path').basename
  , relative = require('path').relative
  , join = require('path').join
  , isAbsolute = require('path').isAbsolute
  , glob = require('glob')
  , fs = require('fs');

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

exports.absolute = isAbsolute || function(path){
  // On Windows the path could start with a drive letter, i.e. a:\\ or two leading backslashes.
  // Also on Windows, the path may have been normalized to forward slashes, so check for this too.
  return path.substr(0, 2) == '\\\\' || '/' === path.charAt(0) || /^[a-z]:[\\\/]/i.test(path);
};

/**
 * Attempt to lookup `path` within `paths` from tail to head.
 * Optionally a path to `ignore` may be passed.
 *
 * @param {String} path
 * @param {String} paths
 * @param {String} ignore
 * @return {String}
 * @api private
 */

exports.lookup = function(path, paths, ignore){
  var lookup
    , i = paths.length;

  // Absolute
  if (exports.absolute(path)) {
    try {
      fs.statSync(path);
      return path;
    } catch (err) {
      // Ignore, continue on
      // to trying relative lookup.
      // Needed for url(/images/foo.png)
      // for example
    }
  }

  // Relative
  while (i--) {
    try {
      lookup = join(paths[i], path);
      if (ignore == lookup) continue;
      fs.statSync(lookup);
      return lookup;
    } catch (err) {
      // Ignore
    }
  }
};

/**
 * Like `utils.lookup` but uses `glob` to find files.
 *
 * @param {String} path
 * @param {String} paths
 * @param {String} ignore
 * @return {Array}
 * @api private
 */
exports.find = function(path, paths, ignore) {
  var lookup
    , found
    , i = paths.length;

  // Absolute
  if (exports.absolute(path)) {
    if ((found = glob.sync(path)).length) {
      return found;
    }
  }

  // Relative
  while (i--) {
    lookup = join(paths[i], path);
    if (ignore == lookup) continue;
    if ((found = glob.sync(lookup)).length) {
      return found;
    }
  }
};

/**
 * Lookup index file inside dir with given `name`.
 *
 * @param {String} name
 * @return {Array}
 * @api private
 */

exports.lookupIndex = function(name, paths, filename){
  // foo/index.styl
  var found = exports.find(join(name, 'index.styl'), paths, filename);
  if (!found) {
    // foo/foo.styl
    found = exports.find(join(name, basename(name).replace(/\.styl/i, '') + '.styl'), paths, filename);
  }
  if (!found && !~name.indexOf('node_modules')) {
    // node_modules/foo/.. or node_modules/foo.styl/..
    found = lookupPackage(join('node_modules', name));
  }
  return found;

  function lookupPackage(dir) {
    var pkg = exports.lookup(join(dir, 'package.json'), paths, filename);
    if (!pkg) {
      return /\.styl$/i.test(dir) ? exports.lookupIndex(dir, paths, filename) : lookupPackage(dir + '.styl');
    }
    var main = require(relative(__dirname, pkg)).main;
    if (main) {
      found = exports.find(join(dir, main), paths, filename);
    } else {
      found = exports.lookupIndex(dir, paths, filename);
    }
    return found;
  }
};

/**
 * Format the given `err` with the given `options`.
 *
 * Options:
 *
 *   - `filename`   context filename
 *   - `context`    context line count [8]
 *   - `lineno`     context line number
 *   - `column`     context column number
 *   - `input`        input string
 *
 * @param {Error} err
 * @param {Object} options
 * @return {Error}
 * @api private
 */

exports.formatException = function(err, options){
  var lineno = options.lineno
    , column = options.column
    , filename = options.filename
    , str = options.input
    , context = options.context || 8
    , context = context / 2
    , lines = ('\n' + str).split('\n')
    , start = Math.max(lineno - context, 1)
    , end = Math.min(lines.length, lineno + context)
    , pad = end.toString().length;

  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start;
    return '   '
      + Array(pad - curr.toString().length + 1).join(' ')
      + curr
      + '| '
      + line
      + (curr == lineno
        ? '\n' + Array(curr.toString().length + 5 + column).join('-') + '^'
        : '');
  }).join('\n');

  err.message = filename
    + ':' + lineno
    + ':' + column
    + '\n' + context
    + '\n\n' + err.message + '\n'
    + (err.stylusStack ? err.stylusStack + '\n' : '');

  // Don't show JS stack trace for Stylus errors
  if (err.fromStylus) err.stack = 'Error: ' + err.message;

  return err;
};

/**
 * Assert that `node` is of the given `type`, or throw.
 *
 * @param {Node} node
 * @param {Function} type
 * @param {String} param
 * @api public
 */

exports.assertType = function(node, type, param){
  exports.assertPresent(node, param);
  if (node.nodeName == type) return;
  var actual = node.nodeName
    , msg = 'expected '
      + (param ? '"' + param + '" to be a ' :  '')
      + type + ', but got '
      + actual + ':' + node;
  throw new Error('TypeError: ' + msg);
};

/**
 * Assert that `node` is a `String` or `Ident`.
 *
 * @param {Node} node
 * @param {String} param
 * @api public
 */

exports.assertString = function(node, param){
  exports.assertPresent(node, param);
  switch (node.nodeName) {
    case 'string':
    case 'ident':
    case 'literal':
      return;
    default:
      var actual = node.nodeName
        , msg = 'expected string, ident or literal, but got ' + actual + ':' + node;
      throw new Error('TypeError: ' + msg);
  }
};

/**
 * Assert that `node` is a `RGBA` or `HSLA`.
 *
 * @param {Node} node
 * @param {String} param
 * @api public
 */

exports.assertColor = function(node, param){
  exports.assertPresent(node, param);
  switch (node.nodeName) {
    case 'rgba':
    case 'hsla':
      return;
    default:
      var actual = node.nodeName
        , msg = 'expected rgba or hsla, but got ' + actual + ':' + node;
      throw new Error('TypeError: ' + msg);
  }
};

/**
 * Assert that param `name` is given, aka the `node` is passed.
 *
 * @param {Node} node
 * @param {String} name
 * @api public
 */

exports.assertPresent = function(node, name){
  if (node) return;
  if (name) throw new Error('"' + name + '" argument required');
  throw new Error('argument missing');
};

/**
 * Unwrap `expr`.
 *
 * Takes an expressions with length of 1
 * such as `((1 2 3))` and unwraps it to `(1 2 3)`.
 *
 * @param {Expression} expr
 * @return {Node}
 * @api public
 */

exports.unwrap = function(expr){
  // explicitly preserve the expression
  if (expr.preserve) return expr;
  if ('arguments' != expr.nodeName && 'expression' != expr.nodeName) return expr;
  if (1 != expr.nodes.length) return expr;
  if ('arguments' != expr.nodes[0].nodeName && 'expression' != expr.nodes[0].nodeName) return expr;
  return exports.unwrap(expr.nodes[0]);
};

/**
 * Coerce JavaScript values to their Stylus equivalents.
 *
 * @param {Mixed} val
 * @param {Boolean} [raw]
 * @return {Node}
 * @api public
 */

exports.coerce = function(val, raw){
  switch (typeof val) {
    case 'function':
      return val;
    case 'string':
      return new nodes.String(val);
    case 'boolean':
      return new nodes.Boolean(val);
    case 'number':
      return new nodes.Unit(val);
    default:
      if (null == val) return nodes.null;
      if (Array.isArray(val)) return exports.coerceArray(val, raw);
      if (val.nodeName) return val;
      return exports.coerceObject(val, raw);
  }
};

/**
 * Coerce a javascript `Array` to a Stylus `Expression`.
 *
 * @param {Array} val
 * @param {Boolean} [raw]
 * @return {Expression}
 * @api private
 */

exports.coerceArray = function(val, raw){
  var expr = new nodes.Expression;
  val.forEach(function(val){
    expr.push(exports.coerce(val, raw));
  });
  return expr;
};

/**
 * Coerce a javascript object to a Stylus `Expression` or `Object`.
 *
 * For example `{ foo: 'bar', bar: 'baz' }` would become
 * the expression `(foo 'bar') (bar 'baz')`. If `raw` is true
 * given `obj` would become a Stylus hash object.
 *
 * @param {Object} obj
 * @param {Boolean} [raw]
 * @return {Expression|Object}
 * @api public
 */

exports.coerceObject = function(obj, raw){
  var node = raw ? new nodes.Object : new nodes.Expression
    , val;

  for (var key in obj) {
    val = exports.coerce(obj[key], raw);
    key = new nodes.Ident(key);
    if (raw) {
      node.set(key, val);
    } else {
      node.push(exports.coerceArray([key, val]));
    }
  }

  return node;
};

/**
 * Return param names for `fn`.
 *
 * @param {Function} fn
 * @return {Array}
 * @api private
 */

exports.params = function(fn){
  return fn
    .toString()
    .match(/\(([^)]*)\)/)[1].split(/ *, */);
};

/**
 * Merge object `b` with `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @param {Boolean} [deep]
 * @return {Object} a
 * @api private
 */
exports.merge = function(a, b, deep) {
  for (var k in b) {
    if (deep && a[k]) {
      var nodeA = exports.unwrap(a[k]).first
        , nodeB = exports.unwrap(b[k]).first;

      if ('object' == nodeA.nodeName && 'object' == nodeB.nodeName) {
        a[k].first.vals = exports.merge(nodeA.vals, nodeB.vals, deep);
      } else {
        a[k] = b[k];
      }
    } else {
      a[k] = b[k];
    }
  }
  return a;
};

/**
 * Returns an array with unique values.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

exports.uniq = function(arr){
  var obj = {}
    , ret = [];

  for (var i = 0, len = arr.length; i < len; ++i) {
    if (arr[i] in obj) continue;

    obj[arr[i]] = true;
    ret.push(arr[i]);
  }
  return ret;
};

/**
 * Compile selector strings in `arr` from the bottom-up
 * to produce the selector combinations. For example
 * the following Stylus:
 *
 *    ul
 *      li
 *      p
 *        a
 *          color: red
 *
 * Would return:
 *
 *      [ 'ul li a', 'ul p a' ]
 *
 * @param {Array} arr
 * @param {Boolean} leaveHidden
 * @return {Array}
 * @api private
 */

exports.compileSelectors = function(arr, leaveHidden){
  var selectors = []
    , Parser = require('./selector-parser')
    , indent = (this.indent || '')
    , buf = [];

  function parse(selector, buf) {
    var parts = [selector.val]
      , str = new Parser(parts[0], parents, parts).parse().val
      , parents = [];

    if (buf.length) {
      for (var i = 0, len = buf.length; i < len; ++i) {
        parts.push(buf[i]);
        parents.push(str);
        var child = new Parser(buf[i], parents, parts).parse();

        if (child.nested) {
          str += ' ' + child.val;
        } else {
          str = child.val;
        }
      }
    }
    return str.trim();
  }

  function compile(arr, i) {
    if (i) {
      arr[i].forEach(function(selector){
        if (!leaveHidden && selector.isPlaceholder) return;
        if (selector.inherits) {
          buf.unshift(selector.val);
          compile(arr, i - 1);
          buf.shift();
        } else {
          selectors.push(indent + parse(selector, buf));
        }
      });
    } else {
      arr[0].forEach(function(selector){
        if (!leaveHidden && selector.isPlaceholder) return;
        var str = parse(selector, buf);
        if (str) selectors.push(indent + str);
      });
    }
  }

  compile(arr, arr.length - 1);

  // Return the list with unique selectors only
  return exports.uniq(selectors);
};

/**
 * Attempt to parse string.
 *
 * @param {String} str
 * @return {Node}
 * @api private
 */

exports.parseString = function(str){
  var Parser = require('./parser')
    , parser
    , ret;

  try {
    parser = new Parser(str);
    parser.state.push('expression');
    ret = new nodes.Expression();
    ret.nodes = parser.parse().nodes;
  } catch (e) {
    ret = new nodes.Literal(str);
  }
  return ret;
};
