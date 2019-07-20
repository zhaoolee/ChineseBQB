/*!
 * Stylus - Compiler
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Visitor = require('./')
  , utils = require('../utils')
  , fs = require('fs');

/**
 * Initialize a new `Compiler` with the given `root` Node
 * and the following `options`.
 *
 * Options:
 *
 *   - `compress`  Compress the CSS output (default: false)
 *
 * @param {Node} root
 * @api public
 */

var Compiler = module.exports = function Compiler(root, options) {
  options = options || {};
  this.compress = options.compress;
  this.firebug = options.firebug;
  this.linenos = options.linenos;
  this.spaces = options['indent spaces'] || 2;
  this.indents = 1;
  Visitor.call(this, root);
  this.stack = [];
};

/**
 * Inherit from `Visitor.prototype`.
 */

Compiler.prototype.__proto__ = Visitor.prototype;

/**
 * Compile to css, and return a string of CSS.
 *
 * @return {String}
 * @api private
 */

Compiler.prototype.compile = function(){
  return this.visit(this.root);
};

/**
 * Output `str`
 *
 * @param {String} str
 * @param {Node} node
 * @return {String}
 * @api private
 */

Compiler.prototype.out = function(str, node){
  return str;
};

/**
 * Return indentation string.
 *
 * @return {String}
 * @api private
 */

Compiler.prototype.__defineGetter__('indent', function(){
  if (this.compress) return '';
  return new Array(this.indents).join(Array(this.spaces + 1).join(' '));
});

/**
 * Check if given `node` needs brackets.
 *
 * @param {Node} node
 * @return {Boolean}
 * @api private
 */

Compiler.prototype.needBrackets = function(node){
  return 1 == this.indents
    || 'atrule' != node.nodeName
    || node.hasOnlyProperties;
};

/**
 * Visit Root.
 */

Compiler.prototype.visitRoot = function(block){
  this.buf = '';
  for (var i = 0, len = block.nodes.length; i < len; ++i) {
    var node = block.nodes[i];
    if (this.linenos || this.firebug) this.debugInfo(node);
    var ret = this.visit(node);
    if (ret) this.buf += this.out(ret + '\n', node);
  }
  return this.buf;
};

/**
 * Visit Block.
 */

Compiler.prototype.visitBlock = function(block){
  var node
    , separator = this.compress ? '' : '\n'
    , needBrackets;

  if (block.hasProperties && !block.lacksRenderedSelectors) {
    needBrackets = this.needBrackets(block.node);

    if (needBrackets) {
      this.buf += this.out(this.compress ? '{' : ' {\n');
      ++this.indents;
    }
    for (var i = 0, len = block.nodes.length; i < len; ++i) {
      this.last = len - 1 == i;
      node = block.nodes[i];
      switch (node.nodeName) {
        case 'null':
        case 'expression':
        case 'function':
        case 'group':
        case 'block':
        case 'unit':
        case 'media':
        case 'keyframes':
        case 'atrule':
        case 'supports':
          continue;
        // inline comments
        case !this.compress && node.inline && 'comment':
          this.buf = this.buf.slice(0, -1);
          this.buf += this.out(' ' + this.visit(node) + '\n', node);
          break;
        case 'property':
          var ret = this.visit(node) + separator;
          this.buf += this.compress ? ret : this.out(ret, node);
          break;
        default:
          this.buf += this.out(this.visit(node) + separator, node);
      }
    }
    if (needBrackets) {
      --this.indents;
      this.buf += this.out(this.indent + '}' + separator);
    }
  }

  // Nesting
  for (var i = 0, len = block.nodes.length; i < len; ++i) {
    node = block.nodes[i];
    switch (node.nodeName) {
      case 'group':
      case 'block':
      case 'keyframes':
        if (this.linenos || this.firebug) this.debugInfo(node);
        this.visit(node);
        break;
      case 'media':
      case 'import':
      case 'atrule':
      case 'supports':
        this.visit(node);
        break;
      case 'comment':
        // only show unsuppressed comments
        if (!node.suppress) {
          this.buf += this.out(this.indent + this.visit(node) + '\n', node);
        }
        break;
      case 'charset':
      case 'literal':
      case 'namespace':
        this.buf += this.out(this.visit(node) + '\n', node);
        break;
    }
  }
};

/**
 * Visit Keyframes.
 */

Compiler.prototype.visitKeyframes = function(node){
  if (!node.frames) return;

  var prefix = 'official' == node.prefix
    ? ''
    : '-' + node.prefix + '-';

  this.buf += this.out('@' + prefix + 'keyframes '
    + this.visit(node.val)
    + (this.compress ? '{' : ' {\n'), node);

  this.keyframe = true;
  ++this.indents;
  this.visit(node.block);
  --this.indents;
  this.keyframe = false;

  this.buf += this.out('}' + (this.compress ? '' : '\n'));
};

/**
 * Visit Media.
 */

Compiler.prototype.visitMedia = function(media){
  var val = media.val;
  if (!media.hasOutput || !val.nodes.length) return;

  this.buf += this.out('@media ', media);
  this.visit(val);
  this.buf += this.out(this.compress ? '{' : ' {\n');
  ++this.indents;
  this.visit(media.block);
  --this.indents;
  this.buf += this.out('}' + (this.compress ? '' : '\n'));
};

/**
 * Visit QueryList.
 */

Compiler.prototype.visitQueryList = function(queries){
  for (var i = 0, len = queries.nodes.length; i < len; ++i) {
    this.visit(queries.nodes[i]);
    if (len - 1 != i) this.buf += this.out(',' + (this.compress ? '' : ' '));
  }
};

/**
 * Visit Query.
 */

Compiler.prototype.visitQuery = function(node){
  var len = node.nodes.length;
  if (node.predicate) this.buf += this.out(node.predicate + ' ');
  if (node.type) this.buf += this.out(node.type + (len ? ' and ' : ''));
  for (var i = 0; i < len; ++i) {
    this.buf += this.out(this.visit(node.nodes[i]));
    if (len - 1 != i) this.buf += this.out(' and ');
  }
};

/**
 * Visit Feature.
 */

Compiler.prototype.visitFeature = function(node){
  if (!node.expr) {
    return node.name;
  } else if (node.expr.isEmpty) {
    return '(' + node.name + ')';
  } else {
    return '(' + node.name + ':' + (this.compress ? '' : ' ') + this.visit(node.expr) + ')';
  }
};

/**
 * Visit Import.
 */

Compiler.prototype.visitImport = function(imported){
  this.buf += this.out('@import ' + this.visit(imported.path) + ';\n', imported);
};

/**
 * Visit Atrule.
 */

Compiler.prototype.visitAtrule = function(atrule){
  var newline = this.compress ? '' : '\n';

  this.buf += this.out(this.indent + '@' + atrule.type, atrule);

  if (atrule.val) this.buf += this.out(' ' + atrule.val.trim());

  if (atrule.block) {
    if (atrule.hasOnlyProperties) {
      this.visit(atrule.block);
    } else {
      this.buf += this.out(this.compress ? '{' : ' {\n');
      ++this.indents;
      this.visit(atrule.block);
      --this.indents;
      this.buf += this.out(this.indent + '}' + newline);
    }
  } else {
    this.buf += this.out(';' + newline);
  }
};

/**
 * Visit Supports.
 */

Compiler.prototype.visitSupports = function(node){
  if (!node.hasOutput) return;

  this.buf += this.out(this.indent + '@supports ', node);
  this.isCondition = true;
  this.buf += this.out(this.visit(node.condition));
  this.isCondition = false;
  this.buf += this.out(this.compress ? '{' : ' {\n');
  ++this.indents;
  this.visit(node.block);
  --this.indents;
  this.buf += this.out(this.indent + '}' + (this.compress ? '' : '\n'));
},

/**
 * Visit Comment.
 */

Compiler.prototype.visitComment = function(comment){
  return this.compress
    ? comment.suppress
      ? ''
      : comment.str
    : comment.str;
};

/**
 * Visit Function.
 */

Compiler.prototype.visitFunction = function(fn){
  return fn.name;
};

/**
 * Visit Charset.
 */

Compiler.prototype.visitCharset = function(charset){
  return '@charset ' + this.visit(charset.val) + ';';
};

/**
 * Visit Namespace.
 */

Compiler.prototype.visitNamespace = function(namespace){
  return '@namespace '
    + (namespace.prefix ? this.visit(namespace.prefix) + ' ' : '')
    + this.visit(namespace.val) + ';';
};

/**
 * Visit Literal.
 */

Compiler.prototype.visitLiteral = function(lit){
  var val = lit.val;
  if (lit.css) val = val.replace(/^  /gm, '');
  return val;
};

/**
 * Visit Boolean.
 */

Compiler.prototype.visitBoolean = function(bool){
  return bool.toString();
};

/**
 * Visit RGBA.
 */

Compiler.prototype.visitRGBA = function(rgba){
  return rgba.toString();
};

/**
 * Visit HSLA.
 */

Compiler.prototype.visitHSLA = function(hsla){
  return hsla.rgba.toString();
};

/**
 * Visit Unit.
 */

Compiler.prototype.visitUnit = function(unit){
  var type = unit.type || ''
    , n = unit.val
    , float = n != (n | 0);

  // Compress
  if (this.compress) {
    // Always return '0' unless the unit is a percentage or time
    if ('%' != type && 's' != type && 'ms' != type && 0 == n) return '0';
    // Omit leading '0' on floats
    if (float && n < 1 && n > -1) {
      return n.toString().replace('0.', '.') + type;
    }
  }

  return (float ? parseFloat(n.toFixed(15)) : n).toString() + type;
};

/**
 * Visit Group.
 */

Compiler.prototype.visitGroup = function(group){
  var stack = this.keyframe ? [] : this.stack
    , comma = this.compress ? ',' : ',\n';

  stack.push(group.nodes);

  // selectors
  if (group.block.hasProperties) {
    var selectors = utils.compileSelectors.call(this, stack)
      , len = selectors.length;

    if (len) {
      if (this.keyframe) comma = this.compress ? ',' : ', ';

      for (var i = 0; i < len; ++i) {
        var selector = selectors[i]
          , last = (i == len - 1);

        // keyframe blocks (10%, 20% { ... })
        if (this.keyframe) selector = i ? selector.trim() : selector;

        this.buf += this.out(selector + (last ? '' : comma), group.nodes[i]);
      }
    } else {
      group.block.lacksRenderedSelectors = true;
    }
  }

  // output block
  this.visit(group.block);
  stack.pop();
};

/**
 * Visit Ident.
 */

Compiler.prototype.visitIdent = function(ident){
  return ident.name;
};

/**
 * Visit String.
 */

Compiler.prototype.visitString = function(string){
  return this.isURL
    ? string.val
    : string.toString();
};

/**
 * Visit Null.
 */

Compiler.prototype.visitNull = function(node){
  return '';
};

/**
 * Visit Call.
 */

Compiler.prototype.visitCall = function(call){
  this.isURL = 'url' == call.name;
  var args = call.args.nodes.map(function(arg){
    return this.visit(arg);
  }, this).join(this.compress ? ',' : ', ');
  if (this.isURL) args = '"' + args + '"';
  this.isURL = false;
  return call.name + '(' + args + ')';
};

/**
 * Visit Expression.
 */

Compiler.prototype.visitExpression = function(expr){
  var buf = []
    , self = this
    , len = expr.nodes.length
    , nodes = expr.nodes.map(function(node){ return self.visit(node); });

  nodes.forEach(function(node, i){
    var last = i == len - 1;
    buf.push(node);
    if ('/' == nodes[i + 1] || '/' == node) return;
    if (last) return;

    var space = self.isURL || (self.isCondition
        && (')' == nodes[i + 1] || '(' == node))
        ? '' : ' ';

    buf.push(expr.isList
      ? (self.compress ? ',' : ', ')
      : space);
  });

  return buf.join('');
};

/**
 * Visit Arguments.
 */

Compiler.prototype.visitArguments = Compiler.prototype.visitExpression;

/**
 * Visit Property.
 */

Compiler.prototype.visitProperty = function(prop){
  var val = this.visit(prop.expr).trim()
    , name = (prop.name || prop.segments.join(''))
    , arr = [];
  arr.push(
    this.out(this.indent),
    this.out(name + (this.compress ? ':' : ': '), prop),
    this.out(val, prop.expr),
    this.out(this.compress ? (this.last ? '' : ';') : ';')
  );
  return arr.join('');
};

/**
 * Debug info.
 */

Compiler.prototype.debugInfo = function(node){

  var path = node.filename == 'stdin' ? 'stdin' : fs.realpathSync(node.filename)
    , line = (node.nodes && node.nodes.length ? node.nodes[0].lineno : node.lineno) || 1;

  if (this.linenos){
    this.buf += '\n/* ' + 'line ' + line + ' : ' + path + ' */\n';
  }

  if (this.firebug){
    // debug info for firebug, the crazy formatting is needed
    path = 'file\\\:\\\/\\\/' + path.replace(/([.:/\\])/g, function(m) {
      return '\\' + (m === '\\' ? '\/' : m)
    });
    line = '\\00003' + line;
    this.buf += '\n@media -stylus-debug-info'
      + '{filename{font-family:' + path
      + '}line{font-family:' + line + '}}\n';
  }
}
