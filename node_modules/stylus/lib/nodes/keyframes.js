
/*!
 * Stylus - Keyframes
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Atrule = require('./atrule');

/**
 * Initialize a new `Keyframes` with the given `segs`,
 * and optional vendor `prefix`.
 *
 * @param {Array} segs
 * @param {String} prefix
 * @api public
 */

var Keyframes = module.exports = function Keyframes(segs, prefix){
  Atrule.call(this, 'keyframes');
  this.segments = segs;
  this.prefix = prefix || 'official';
};

/**
 * Inherit from `Atrule.prototype`.
 */

Keyframes.prototype.__proto__ = Atrule.prototype;

/**
 * Return a clone of this node.
 * 
 * @return {Node}
 * @api public
 */

Keyframes.prototype.clone = function(parent){
  var clone = new Keyframes;
  clone.lineno = this.lineno;
  clone.column = this.column;
  clone.filename = this.filename;
  clone.segments = this.segments.map(function(node) { return node.clone(parent, clone); });
  clone.prefix = this.prefix;
  clone.block = this.block.clone(parent, clone);
  return clone;
};

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Keyframes.prototype.toJSON = function(){
  return {
    __type: 'Keyframes',
    segments: this.segments,
    prefix: this.prefix,
    block: this.block,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};

/**
 * Return `@keyframes name`.
 *
 * @return {String}
 * @api public
 */

Keyframes.prototype.toString = function(){
  return '@keyframes ' + this.segments.join('');
};
