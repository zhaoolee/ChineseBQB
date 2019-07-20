
/*!
 * Stylus - Property
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Property` with the given `segs` and optional `expr`.
 *
 * @param {Array} segs
 * @param {Expression} expr
 * @api public
 */

var Property = module.exports = function Property(segs, expr){
  Node.call(this);
  this.segments = segs;
  this.expr = expr;
};

/**
 * Inherit from `Node.prototype`.
 */

Property.prototype.__proto__ = Node.prototype;

/**
 * Return a clone of this node.
 * 
 * @return {Node}
 * @api public
 */

Property.prototype.clone = function(parent){
  var clone = new Property(this.segments);
  clone.name = this.name;
  if (this.literal) clone.literal = this.literal;
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  clone.segments = this.segments.map(function(node){ return node.clone(parent, clone); });
  if (this.expr) clone.expr = this.expr.clone(parent, clone);
  return clone;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Property.prototype.toJSON = function(){
  var json = {
    __type: 'Property',
    segments: this.segments,
    name: this.name,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
  if (this.expr) json.expr = this.expr;
  if (this.literal) json.literal = this.literal;
  return json;
};

/**
 * Return string representation of this node.
 *
 * @return {String}
 * @api public
 */

Property.prototype.toString = function(){
  return 'property(' + this.segments.join('') + ', ' + this.expr + ')';
};

/**
 * Operate on the property expression.
 *
 * @param {String} op
 * @param {Node} right
 * @return {Node}
 * @api public
 */

Property.prototype.operate = function(op, right, val){
  return this.expr.operate(op, right, val);
};
