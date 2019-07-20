
/*!
 * Stylus - Group
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Group`.
 *
 * @api public
 */

var Group = module.exports = function Group(){
  Node.call(this);
  this.nodes = [];
  this.extends = [];
};

/**
 * Inherit from `Node.prototype`.
 */

Group.prototype.__proto__ = Node.prototype;

/**
 * Push the given `selector` node.
 *
 * @param {Selector} selector
 * @api public
 */

Group.prototype.push = function(selector){
  this.nodes.push(selector);
};

/**
 * Return this set's `Block`.
 */

Group.prototype.__defineGetter__('block', function(){
  return this.nodes[0].block;
});

/**
 * Assign `block` to each selector in this set.
 *
 * @param {Block} block
 * @api public
 */

Group.prototype.__defineSetter__('block', function(block){
  for (var i = 0, len = this.nodes.length; i < len; ++i) {
    this.nodes[i].block = block;
  }
});

/**
 * Check if this set has only placeholders.
 *
 * @return {Boolean}
 * @api public
 */

Group.prototype.__defineGetter__('hasOnlyPlaceholders', function(){
  return this.nodes.every(function(selector) { return selector.isPlaceholder; });
});

/**
 * Return a clone of this node.
 * 
 * @return {Node}
 * @api public
 */

Group.prototype.clone = function(parent){
  var clone = new Group;
  clone.lineno = this.lineno;
  clone.column = this.column;
  this.nodes.forEach(function(node){
    clone.push(node.clone(parent, clone));
  });
  clone.filename = this.filename;
  clone.block = this.block.clone(parent, clone);
  return clone;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Group.prototype.toJSON = function(){
  return {
    __type: 'Group',
    nodes: this.nodes,
    block: this.block,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};
