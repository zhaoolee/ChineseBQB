
/*!
 * Stylus - Member
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Member` with `left` and `right`.
 *
 * @param {Node} left
 * @param {Node} right
 * @api public
 */

var Member = module.exports = function Member(left, right){
  Node.call(this);
  this.left = left;
  this.right = right;
};

/**
 * Inherit from `Node.prototype`.
 */

Member.prototype.__proto__ = Node.prototype;

/**
 * Return a clone of this node.
 *
 * @return {Node}
 * @api public
 */

Member.prototype.clone = function(parent){
  var clone = new Member;
  clone.left = this.left.clone(parent, clone);
  clone.right = this.right.clone(parent, clone);
  if (this.val) clone.val = this.val.clone(parent, clone);
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

Member.prototype.toJSON = function(){
  var json = {
    __type: 'Member',
    left: this.left,
    right: this.right,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
  if (this.val) json.val = this.val;
  return json;
};

/**
 * Return a string representation of this node.
 *
 * @return {String}
 * @api public
 */

Member.prototype.toString = function(){
  return this.left.toString()
    + '.' + this.right.toString();
};
