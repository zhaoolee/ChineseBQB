
/**
 * Module dependencies.
 */

var Visitor = require('./')
  , Parser = require('../parser')
  , nodes = require('../nodes')
  , utils = require('../utils')
  , dirname = require('path').dirname
  , fs = require('fs');

/**
 * Initialize a new `DepsResolver` with the given `root` Node
 * and the `options`.
 *
 * @param {Node} root
 * @param {Object} options
 * @api private
 */

var DepsResolver = module.exports = function DepsResolver(root, options) {
  this.root = root;
  this.filename = options.filename;
  this.paths = options.paths || [];
  this.paths.push(dirname(options.filename || '.'));
  this.options = options;
  this.functions = {};
  this.deps = [];
};

/**
 * Inherit from `Visitor.prototype`.
 */

DepsResolver.prototype.__proto__ = Visitor.prototype;

var visit = DepsResolver.prototype.visit;

DepsResolver.prototype.visit = function(node) {
  switch (node.nodeName) {
    case 'root':
    case 'block':
    case 'expression':
      this.visitRoot(node);
      break;
    case 'group':
    case 'media':
    case 'atblock':
    case 'atrule':
    case 'keyframes':
    case 'each':
    case 'supports':
      this.visit(node.block);
      break;
    default:
      visit.call(this, node);
  }
};

/**
 * Visit Root.
 */

DepsResolver.prototype.visitRoot = function(block) {
  for (var i = 0, len = block.nodes.length; i < len; ++i) {
    this.visit(block.nodes[i]);
  }
};

/**
 * Visit Ident.
 */

DepsResolver.prototype.visitIdent = function(ident) {
  this.visit(ident.val);
};

/**
 * Visit If.
 */

DepsResolver.prototype.visitIf = function(node) {
  this.visit(node.block);
  this.visit(node.cond);
  for (var i = 0, len = node.elses.length; i < len; ++i) {
    this.visit(node.elses[i]);
  }
};

/**
 * Visit Function.
 */

DepsResolver.prototype.visitFunction = function(fn) {
  this.functions[fn.name] = fn.block;
};

/**
 * Visit Call.
 */

DepsResolver.prototype.visitCall = function(call) {
  if (call.name in this.functions) this.visit(this.functions[call.name]);
  if (call.block) this.visit(call.block);
};

/**
 * Visit Import.
 */

DepsResolver.prototype.visitImport = function(node) {
  var path = node.path.first.val
    , literal, found, oldPath;

  if (!path) return;

  literal = /\.css(?:"|$)/.test(path);

  // support optional .styl
  if (!literal && !/\.styl$/i.test(path)) {
    oldPath = path;
    path += '.styl';
  }

  // Lookup
  found = utils.find(path, this.paths, this.filename);

  // support optional index
  if (!found && oldPath) found = utils.lookupIndex(oldPath, this.paths, this.filename);

  if (!found) return;

  this.deps = this.deps.concat(found);

  if (literal) return;

  // nested imports
  for (var i = 0, len = found.length; i < len; ++i) {
    var file = found[i]
      , dir = dirname(file)
      , str = fs.readFileSync(file, 'utf-8')
      , block = new nodes.Block
      , parser = new Parser(str, utils.merge({ root: block }, this.options));

    if (!~this.paths.indexOf(dir)) this.paths.push(dir);

    try {
      block = parser.parse();
    } catch (err) {
      err.filename = file;
      err.lineno = parser.lexer.lineno;
      err.column = parser.lexer.column;
      err.input = str;
      throw err;
    }

    this.visit(block);
  }
};

/**
 * Get dependencies.
 */

DepsResolver.prototype.resolve = function() {
  this.visit(this.root);
  return utils.uniq(this.deps);
};
