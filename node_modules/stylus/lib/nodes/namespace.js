/*!
 * Stylus - Namespace
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Namespace` with the given `val` and `prefix`
 *
 * @param {String|Call} val
 * @param {String} [prefix]
 * @api public
 */

var Namespace = module.exports = function Namespace(val, prefix){
  Node.call(this);
  this.val = val;
  this.prefix = prefix;
};

/**
 * Inherit from `Node.prototype`.
 */

Namespace.prototype.__proto__ = Node.prototype;

/**
 * Return @namespace "val".
 *
 * @return {String}
 * @api public
 */

Namespace.prototype.toString = function(){
  return '@namespace ' + (this.prefix ? this.prefix + ' ' : '') + this.val;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Namespace.prototype.toJSON = function(){
  return {
    __type: 'Namespace',
    val: this.val,
    prefix: this.prefix,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};
