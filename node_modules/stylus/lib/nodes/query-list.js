
/*!
 * Stylus - QueryList
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `QueryList`.
 *
 * @api public
 */

var QueryList = module.exports = function QueryList(){
  Node.call(this);
  this.nodes = [];
};

/**
 * Inherit from `Node.prototype`.
 */

QueryList.prototype.__proto__ = Node.prototype;

/**
 * Return a clone of this node.
 * 
 * @return {Node}
 * @api public
 */

QueryList.prototype.clone = function(parent){
  var clone = new QueryList;
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  for (var i = 0; i < this.nodes.length; ++i) {
    clone.push(this.nodes[i].clone(parent, clone));
  }
  return clone;
};

/**
 * Push the given `node`.
 *
 * @param {Node} node
 * @api public
 */

QueryList.prototype.push = function(node){
  this.nodes.push(node);
};

/**
 * Merges this query list with the `other`.
 *
 * @param {QueryList} other
 * @return {QueryList}
 * @api private
 */

QueryList.prototype.merge = function(other){
  var list = new QueryList
    , merged;
  this.nodes.forEach(function(query){
    for (var i = 0, len = other.nodes.length; i < len; ++i){
      merged = query.merge(other.nodes[i]);
      if (merged) list.push(merged);
    }
  });
  return list;
};

/**
 * Return "<a>, <b>, <c>"
 *
 * @return {String}
 * @api public
 */

QueryList.prototype.toString = function(){
  return '(' + this.nodes.map(function(node){
    return node.toString();
  }).join(', ') + ')';
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

QueryList.prototype.toJSON = function(){
  return {
    __type: 'QueryList',
    nodes: this.nodes,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};
