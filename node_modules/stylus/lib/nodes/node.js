
/*!
 * Stylus - Node
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Evaluator = require('../visitor/evaluator')
  , utils = require('../utils')
  , nodes = require('./');

/**
 * Initialize a new `CoercionError` with the given `msg`.
 *
 * @param {String} msg
 * @api private
 */

function CoercionError(msg) {
  this.name = 'CoercionError'
  this.message = msg
  Error.captureStackTrace(this, CoercionError);
}

/**
 * Inherit from `Error.prototype`.
 */

CoercionError.prototype.__proto__ = Error.prototype;

/**
 * Node constructor.
 *
 * @api public
 */

var Node = module.exports = function Node(){
  this.lineno = nodes.lineno || 1;
  this.column = nodes.column || 1;
  this.filename = nodes.filename;
};

Node.prototype = {
  constructor: Node,

  /**
   * Return this node.
   *
   * @return {Node}
   * @api public
   */

  get first() {
    return this;
  },

  /**
   * Return hash.
   *
   * @return {String}
   * @api public
   */

  get hash() {
    return this.val;
  },

  /**
   * Return node name.
   *
   * @return {String}
   * @api public
   */

  get nodeName() {
    return this.constructor.name.toLowerCase();
  },

  /**
   * Return this node.
   * 
   * @return {Node}
   * @api public
   */

  clone: function(){
    return this;
  },

  /**
   * Return a JSON representation of this node.
   *
   * @return {Object}
   * @api public
   */

  toJSON: function(){
    return {
      lineno: this.lineno,
      column: this.column,
      filename: this.filename
    };
  },

  /**
   * Nodes by default evaluate to themselves.
   *
   * @return {Node}
   * @api public
   */

  eval: function(){
    return new Evaluator(this).evaluate();
  },

  /**
   * Return true.
   *
   * @return {Boolean}
   * @api public
   */

  toBoolean: function(){
    return nodes.true;
  },

  /**
   * Return the expression, or wrap this node in an expression.
   *
   * @return {Expression}
   * @api public
   */

  toExpression: function(){
    if ('expression' == this.nodeName) return this;
    var expr = new nodes.Expression;
    expr.push(this);
    return expr;
  },

  /**
   * Return false if `op` is generally not coerced.
   *
   * @param {String} op
   * @return {Boolean}
   * @api private
   */

  shouldCoerce: function(op){
    switch (op) {
      case 'is a':
      case 'in':
      case '||':
      case '&&':
        return false;
      default:
        return true;
    }
  },

  /**
   * Operate on `right` with the given `op`.
   *
   * @param {String} op
   * @param {Node} right
   * @return {Node}
   * @api public
   */

  operate: function(op, right){
    switch (op) {
      case 'is a':
        if ('string' == right.first.nodeName) {
          return nodes.Boolean(this.nodeName == right.val);
        } else {
          throw new Error('"is a" expects a string, got ' + right.toString());
        }
      case '==':
        return nodes.Boolean(this.hash == right.hash);
      case '!=':
        return nodes.Boolean(this.hash != right.hash);
      case '>=':
        return nodes.Boolean(this.hash >= right.hash);
      case '<=':
        return nodes.Boolean(this.hash <= right.hash);
      case '>':
        return nodes.Boolean(this.hash > right.hash);
      case '<':
        return nodes.Boolean(this.hash < right.hash);
      case '||':
        return this.toBoolean().isTrue
          ? this
          : right;
      case 'in':
        var vals = utils.unwrap(right).nodes
          , len = vals && vals.length
          , hash = this.hash;
        if (!vals) throw new Error('"in" given invalid right-hand operand, expecting an expression');

        // 'prop' in obj
        if (1 == len && 'object' == vals[0].nodeName) {
          return nodes.Boolean(vals[0].has(this.hash));
        }

        for (var i = 0; i < len; ++i) {
          if (hash == vals[i].hash) {
            return nodes.true;
          }
        }
        return nodes.false;
      case '&&':
        var a = this.toBoolean()
          , b = right.toBoolean();
        return a.isTrue && b.isTrue
          ? right
          : a.isFalse
            ? this
            : right;
      default:
        if ('[]' == op) {
          var msg = 'cannot perform '
            + this
            + '[' + right + ']';
        } else {
          var msg = 'cannot perform'
            + ' ' + this
            + ' ' + op
            + ' ' + right;
        }
        throw new Error(msg);
    }
  },

  /**
   * Default coercion throws.
   *
   * @param {Node} other
   * @return {Node}
   * @api public
   */

  coerce: function(other){
    if (other.nodeName == this.nodeName) return other;
    throw new CoercionError('cannot coerce ' + other + ' to ' + this.nodeName);
  }
};
