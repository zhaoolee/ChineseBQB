
/*!
 * Stylus - Normalizer
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Visitor = require('./')
  , nodes = require('../nodes')
  , utils = require('../utils');

/**
 * Initialize a new `Normalizer` with the given `root` Node.
 *
 * This visitor implements the first stage of the duel-stage
 * compiler, tasked with stripping the "garbage" from
 * the evaluated nodes, ditching null rules, resolving
 * ruleset selectors etc. This step performs the logic
 * necessary to facilitate the "@extend" functionality,
 * as these must be resolved _before_ buffering output.
 *
 * @param {Node} root
 * @api public
 */

var Normalizer = module.exports = function Normalizer(root, options) {
  options = options || {};
  Visitor.call(this, root);
  this.hoist = options['hoist atrules'];
  this.stack = [];
  this.map = {};
  this.imports = [];
};

/**
 * Inherit from `Visitor.prototype`.
 */

Normalizer.prototype.__proto__ = Visitor.prototype;

/**
 * Normalize the node tree.
 *
 * @return {Node}
 * @api private
 */

Normalizer.prototype.normalize = function(){
  var ret = this.visit(this.root);

  if (this.hoist) {
    // hoist @import
    if (this.imports.length) ret.nodes = this.imports.concat(ret.nodes);

    // hoist @charset
    if (this.charset) ret.nodes = [this.charset].concat(ret.nodes);
  }

  return ret;
};

/**
 * Bubble up the given `node`.
 *
 * @param {Node} node
 * @api private
 */

Normalizer.prototype.bubble = function(node){
  var props = []
    , other = []
    , self = this;

  function filterProps(block) {
    block.nodes.forEach(function(node) {
      node = self.visit(node);

      switch (node.nodeName) {
        case 'property':
          props.push(node);
          break;
        case 'block':
          filterProps(node);
          break;
        default:
          other.push(node);
      }
    });
  }

  filterProps(node.block);

  if (props.length) {
    var selector = new nodes.Selector([new nodes.Literal('&')]);
    selector.lineno = node.lineno;
    selector.column = node.column;
    selector.filename = node.filename;
    selector.val = '&';

    var group = new nodes.Group;
    group.lineno = node.lineno;
    group.column = node.column;
    group.filename = node.filename;

    var block = new nodes.Block(node.block, group);
    block.lineno = node.lineno;
    block.column = node.column;
    block.filename = node.filename;

    props.forEach(function(prop){
      block.push(prop);
    });

    group.push(selector);
    group.block = block;

    node.block.nodes = [];
    node.block.push(group);
    other.forEach(function(n){
      node.block.push(n);
    });

    var group = this.closestGroup(node.block);
    if (group) node.group = group.clone();

    node.bubbled = true;
  }
};

/**
 * Return group closest to the given `block`.
 *
 * @param {Block} block
 * @return {Group}
 * @api private
 */

Normalizer.prototype.closestGroup = function(block){
  var parent = block.parent
    , node;
  while (parent && (node = parent.node)) {
    if ('group' == node.nodeName) return node;
    parent = node.block && node.block.parent;
  }
};

/**
 * Visit Root.
 */

Normalizer.prototype.visitRoot = function(block){
  var ret = new nodes.Root
    , node;

  for (var i = 0; i < block.nodes.length; ++i) {
    node = block.nodes[i];
    switch (node.nodeName) {
      case 'null':
      case 'expression':
      case 'function':
      case 'unit':
      case 'atblock':
        continue;
      default:
        this.rootIndex = i;
        ret.push(this.visit(node));
    }
  }

  return ret;
};

/**
 * Visit Property.
 */

Normalizer.prototype.visitProperty = function(prop){
  this.visit(prop.expr);
  return prop;
};

/**
 * Visit Expression.
 */

Normalizer.prototype.visitExpression = function(expr){
  expr.nodes = expr.nodes.map(function(node){
    // returns `block` literal if mixin's block
    // is used as part of a property value
    if ('block' == node.nodeName) {
      var literal = new nodes.Literal('block');
      literal.lineno = expr.lineno;
      literal.column = expr.column;
      return literal;
    }
    return node;
  });
  return expr;
};

/**
 * Visit Block.
 */

Normalizer.prototype.visitBlock = function(block){
  var node;

  if (block.hasProperties) {
    for (var i = 0, len = block.nodes.length; i < len; ++i) {
      node = block.nodes[i];
      switch (node.nodeName) {
        case 'null':
        case 'expression':
        case 'function':
        case 'group':
        case 'unit':
        case 'atblock':
          continue;
        default:
          block.nodes[i] = this.visit(node);
      }
    }
  }

  // nesting
  for (var i = 0, len = block.nodes.length; i < len; ++i) {
    node = block.nodes[i];
    block.nodes[i] = this.visit(node);
  }

  return block;
};

/**
 * Visit Group.
 */

Normalizer.prototype.visitGroup = function(group){
  var stack = this.stack
    , map = this.map
    , parts;

  // normalize interpolated selectors with comma
  group.nodes.forEach(function(selector, i){
    if (!~selector.val.indexOf(',')) return;
    if (~selector.val.indexOf('\\,')) {
      selector.val = selector.val.replace(/\\,/g, ',');
      return;
    }
    parts = selector.val.split(',');
    var root = '/' == selector.val.charAt(0)
      , part, s;
    for (var k = 0, len = parts.length; k < len; ++k){
      part = parts[k].trim();
      if (root && k > 0 && !~part.indexOf('&')) {
        part = '/' + part;
      }
      s = new nodes.Selector([new nodes.Literal(part)]);
      s.val = part;
      s.block = group.block;
      group.nodes[i++] = s;
    }
  });
  stack.push(group.nodes);

  var selectors = utils.compileSelectors(stack, true);

  // map for extension lookup
  selectors.forEach(function(selector){
    map[selector] = map[selector] || [];
    map[selector].push(group);
  });

  // extensions
  this.extend(group, selectors);

  stack.pop();
  return group;
};

/**
 * Visit Function.
 */

Normalizer.prototype.visitFunction = function(){
  return nodes.null;
};

/**
 * Visit Media.
 */

Normalizer.prototype.visitMedia = function(media){
  var medias = []
    , group = this.closestGroup(media.block)
    , parent;

  function mergeQueries(block) {
    block.nodes.forEach(function(node, i){
      switch (node.nodeName) {
        case 'media':
          node.val = media.val.merge(node.val);
          medias.push(node);
          block.nodes[i] = nodes.null;
          break;
        case 'block':
          mergeQueries(node);
          break;
        default:
          if (node.block && node.block.nodes)
            mergeQueries(node.block);
      }
    });
  }

  mergeQueries(media.block);
  this.bubble(media);

  if (medias.length) {
    medias.forEach(function(node){
      if (group) {
        group.block.push(node);
      } else {
        this.root.nodes.splice(++this.rootIndex, 0, node);
      }
      node = this.visit(node);
      parent = node.block.parent;
      if (node.bubbled && (!group || 'group' == parent.node.nodeName)) {
        node.group.block = node.block.nodes[0].block;
        node.block.nodes[0] = node.group;
      }
    }, this);
  }
  return media;
};

/**
 * Visit Supports.
 */

Normalizer.prototype.visitSupports = function(node){
  this.bubble(node);
  return node;
};

/**
 * Visit Atrule.
 */

Normalizer.prototype.visitAtrule = function(node){
  if (node.block) node.block = this.visit(node.block);
  return node;
};

/**
 * Visit Keyframes.
 */

Normalizer.prototype.visitKeyframes = function(node){
  var frames = node.block.nodes.filter(function(frame){
    return frame.block && frame.block.hasProperties;
  });
  node.frames = frames.length;
  return node;
};

/**
 * Visit Import.
 */

Normalizer.prototype.visitImport = function(node){
  this.imports.push(node);
  return this.hoist ? nodes.null : node;
};

/**
 * Visit Charset.
 */

Normalizer.prototype.visitCharset = function(node){
  this.charset = node;
  return this.hoist ? nodes.null : node;
};

/**
 * Apply `group` extensions.
 *
 * @param {Group} group
 * @param {Array} selectors
 * @api private
 */

Normalizer.prototype.extend = function(group, selectors){
  var map = this.map
    , self = this
    , parent = this.closestGroup(group.block);

  group.extends.forEach(function(extend){
    var groups = map[extend.selector];
    if (!groups) {
      if (extend.optional) return;
      var err = new Error('Failed to @extend "' + extend.selector + '"');
      err.lineno = extend.lineno;
      err.column = extend.column;
      throw err;
    }
    selectors.forEach(function(selector){
      var node = new nodes.Selector;
      node.val = selector;
      node.inherits = false;
      groups.forEach(function(group){
        // prevent recursive extend
        if (!parent || (parent != group)) self.extend(group, selectors);
        group.push(node);
      });
    });
  });

  group.block = this.visit(group.block);
};
