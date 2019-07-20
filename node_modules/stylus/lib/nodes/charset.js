
/*!
 * Stylus - Charset
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Charset` with the given `val`
 *
 * @param {String} val
 * @api public
 */

var Charset = module.exports = function Charset(val){
  Node.call(this);
  this.val = val;
};

/**
 * Inherit from `Node.prototype`.
 */

Charset.prototype.__proto__ = Node.prototype;

/**
 * Return @charset "val".
 *
 * @return {String}
 * @api public
 */

Charset.prototype.toString = function(){
  return '@charset ' + this.val;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Charset.prototype.toJSON = function(){
  return {
    __type: 'Charset',
    val: this.val,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};
