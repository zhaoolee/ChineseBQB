
/*!
 * Stylus - Root
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Root` node.
 *
 * @api public
 */

var Root = module.exports = function Root(){
  this.nodes = [];
};

/**
 * Inherit from `Node.prototype`.
 */

Root.prototype.__proto__ = Node.prototype;

/**
 * Push a `node` to this block.
 *
 * @param {Node} node
 * @api public
 */

Root.prototype.push = function(node){
  this.nodes.push(node);
};

/**
 * Unshift a `node` to this block.
 *
 * @param {Node} node
 * @api public
 */

Root.prototype.unshift = function(node){
  this.nodes.unshift(node);
};

/**
 * Return a clone of this node.
 *
 * @return {Node}
 * @api public
 */

Root.prototype.clone = function(){
  var clone = new Root();
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  this.nodes.forEach(function(node){
    clone.push(node.clone(clone, clone));
  });
  return clone;
};

/**
 * Return "root".
 *
 * @return {String}
 * @api public
 */

Root.prototype.toString = function(){
  return '[Root]';
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Root.prototype.toJSON = function(){
  return {
    __type: 'Root',
    nodes: this.nodes,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};
