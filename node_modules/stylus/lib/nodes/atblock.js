/*!
 * Stylus - @block
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `@block` node.
 *
 * @api public
 */

var Atblock = module.exports = function Atblock(){
  Node.call(this);
};

/**
 * Return `block` nodes.
 */

Atblock.prototype.__defineGetter__('nodes', function(){
  return this.block.nodes;
});

/**
 * Inherit from `Node.prototype`.
 */

Atblock.prototype.__proto__ = Node.prototype;

/**
 * Return a clone of this node.
 *
 * @return {Node}
 * @api public
 */

Atblock.prototype.clone = function(parent){
  var clone = new Atblock;
  clone.block = this.block.clone(parent, clone);
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  return clone;
};

/**
 * Return @block.
 *
 * @return {String}
 * @api public
 */

Atblock.prototype.toString = function(){
  return '@block';
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Atblock.prototype.toJSON = function(){
  return {
    __type: 'Atblock',
    block: this.block,
    lineno: this.lineno,
    column: this.column,
    fileno: this.fileno
  };
};
