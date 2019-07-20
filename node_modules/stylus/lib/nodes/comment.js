
/*!
 * Stylus - Comment
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Node = require('./node');

/**
 * Initialize a new `Comment` with the given `str`.
 *
 * @param {String} str
 * @param {Boolean} suppress
 * @param {Boolean} inline
 * @api public
 */

var Comment = module.exports = function Comment(str, suppress, inline){
  Node.call(this);
  this.str = str;
  this.suppress = suppress;
  this.inline = inline;
};

/**
 * Inherit from `Node.prototype`.
 */

Comment.prototype.__proto__ = Node.prototype;

/**
 * Return a JSON representation of this node.
 *
 * @return {Object}
 * @api public
 */

Comment.prototype.toJSON = function(){
  return {
    __type: 'Comment',
    str: this.str,
    suppress: this.suppress,
    inline: this.inline,
    lineno: this.lineno,
    column: this.column,
    filename: this.filename
  };
};

/**
 * Return comment.
 *
 * @return {String}
 * @api public
 */

Comment.prototype.toString = function(){
  return this.str;
};
