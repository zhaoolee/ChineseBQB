
/*!
 * Stylus - Arguments
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node')
  , nodes = require('../nodes')
  , utils = require('../utils');

/**
 * Initialize a new `Arguments`.
 *
 * @api public
 */

var Arguments = module.exports = function Arguments(){
  nodes.Expression.call(this);
  this.map = {};
};

/**
 * Inherit from `nodes.Expression.prototype`.
 */

Arguments.prototype.__proto__ = nodes.Expression.prototype;

/**
 * Initialize an `Arguments` object with the nodes
 * from the given `expr`.
 *
 * @param {Expression} expr
 * @return {Arguments}
 * @api public
 */

Arguments.fromExpression = function(expr){
  var args = new Arguments
    , len = expr.nodes.length;
  args.lineno = expr.lineno;
  args.column = expr.column;
  args.isList = expr.isList;
  for (var i = 0; i < len; ++i) {
    args.push(expr.nodes[i]);
  }
  return args;
};

/**
 * Return a clone of this node.
 *
 * @return {Node}
 * @api public
 */

Arguments.prototype.clone = function(parent){
  var clone = nodes.Expression.prototype.clone.call(this, parent);
  clone.map = {};
  for (var key in this.map) {
    clone.map[key] = this.map[key].clone(parent, clone);
  }
  clone.isList = this.isList;
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  return clone;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Arguments.prototype.toJSON = function(){
  return {
    __type: 'Arguments',
    map: this.map,
    isList: this.isList,
    preserve: this.preserve,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename,
    nodes: this.nodes
  };
};
