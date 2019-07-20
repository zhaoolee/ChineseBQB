/*!
 * Stylus - supports
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Atrule = require('./atrule');

/**
 * Initialize a new supports node.
 *
 * @param {Expression} condition
 * @api public
 */

var Supports = module.exports = function Supports(condition){
  Atrule.call(this, 'supports');
  this.condition = condition;
};

/**
 * Inherit from `Atrule.prototype`.
 */

Supports.prototype.__proto__ = Atrule.prototype;

/**
 * Return a clone of this node.
 *
 * @return {Node}
 * @api public
 */

Supports.prototype.clone = function(parent){
  var clone = new Supports;
  clone.condition = this.condition.clone(parent, clone);
  clone.block = this.block.clone(parent, clone);
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

Supports.prototype.toJSON = function(){
  return {
    __type: 'Supports',
    condition: this.condition,
    block: this.block,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};

/**
 * Return @supports
 *
 * @return {String}
 * @api public
 */

Supports.prototype.toString = function(){
  return '@supports ' + this.condition;
};
