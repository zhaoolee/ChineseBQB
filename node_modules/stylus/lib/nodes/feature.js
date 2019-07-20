
/*!
 * Stylus - Feature
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Feature` with the given `segs`.
 *
 * @param {Array} segs
 * @api public
 */

var Feature = module.exports = function Feature(segs){
  Node.call(this);
  this.segments = segs;
  this.expr = null;
};

/**
 * Inherit from `Node.prototype`.
 */

Feature.prototype.__proto__ = Node.prototype;

/**
 * Return a clone of this node.
 * 
 * @return {Node}
 * @api public
 */

Feature.prototype.clone = function(parent){
  var clone = new Feature;
  clone.segments = this.segments.map(function(node){ return node.clone(parent, clone); });
  if (this.expr) clone.expr = this.expr.clone(parent, clone);
  if (this.name) clone.name = this.name;
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  return clone;
};

/**
 * Return "<ident>" or "(<ident>: <expr>)"
 *
 * @return {String}
 * @api public
 */

Feature.prototype.toString = function(){
  if (this.expr) {
    return '(' + this.segments.join('') + ': ' + this.expr.toString() + ')';
  } else {
    return this.segments.join('');
  }
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Feature.prototype.toJSON = function(){
  var json = {
    __type: 'Feature',
    segments: this.segments,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
  if (this.expr) json.expr = this.expr;
  if (this.name) json.name = this.name;
  return json;
};
