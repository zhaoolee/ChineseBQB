
/*!
 * Stylus - Evaluator
 * Copyright (c) Automattic <developer.wordpress.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Visitor = require('./')
  , units = require('../units')
  , nodes = require('../nodes')
  , Stack = require('../stack')
  , Frame = require('../stack/frame')
  , utils = require('../utils')
  , bifs = require('../functions')
  , dirname = require('path').dirname
  , colors = require('../colors')
  , debug = require('debug')('stylus:evaluator')
  , fs = require('fs');

/**
 * Import `file` and return Block node.
 *
 * @api private
 */
function importFile(node, file, literal) {
  var importStack = this.importStack
    , Parser = require('../parser')
    , stat;

  // Handling the `require`
  if (node.once) {
    if (this.requireHistory[file]) return nodes.null;
    this.requireHistory[file] = true;

    if (literal && !this.includeCSS) {
      return node;
    }
  }

  // Avoid overflows from importing the same file over again
  if (~importStack.indexOf(file))
    throw new Error('import loop has been found');

  var str = fs.readFileSync(file, 'utf8');

  // shortcut for empty files
  if (!str.trim()) return nodes.null;

  // Expose imports
  node.path = file;
  node.dirname = dirname(file);
  // Store the modified time
  stat = fs.statSync(file);
  node.mtime = stat.mtime;
  this.paths.push(node.dirname);

  if (this.options._imports) this.options._imports.push(node.clone());

  // Parse the file
  importStack.push(file);
  nodes.filename = file;

  if (literal) {
    literal = new nodes.Literal(str.replace(/\r\n?/g, '\n'));
    literal.lineno = literal.column = 1;
    if (!this.resolveURL) return literal;
  }

  // parse
  var block = new nodes.Block
    , parser = new Parser(str, utils.merge({ root: block }, this.options));

  try {
    block = parser.parse();
  } catch (err) {
    var line = parser.lexer.lineno
      , column = parser.lexer.column;

    if (literal && this.includeCSS && this.resolveURL) {
      this.warn('ParseError: ' + file + ':' + line + ':' + column + '. This file included as-is');
      return literal;
    } else {
      err.filename = file;
      err.lineno = line;
      err.column = column;
      err.input = str;
      throw err;
    }
  }

  // Evaluate imported "root"
  block = block.clone(this.currentBlock);
  block.parent = this.currentBlock;
  block.scope = false;
  var ret = this.visit(block);
  importStack.pop();
  if (!this.resolveURL || this.resolveURL.nocheck) this.paths.pop();

  return ret;
}

/**
 * Initialize a new `Evaluator` with the given `root` Node
 * and the following `options`.
 *
 * Options:
 *
 *   - `compress`  Compress the css output, defaults to false
 *   - `warn`  Warn the user of duplicate function definitions etc
 *
 * @param {Node} root
 * @api private
 */

var Evaluator = module.exports = function Evaluator(root, options) {
  options = options || {};
  Visitor.call(this, root);
  var functions = this.functions = options.functions || {};
  this.stack = new Stack;
  this.imports = options.imports || [];
  this.globals = options.globals || {};
  this.paths = options.paths || [];
  this.prefix = options.prefix || '';
  this.filename = options.filename;
  this.includeCSS = options['include css'];
  this.resolveURL = functions.url
    && 'resolver' == functions.url.name
    && functions.url.options;
  this.paths.push(dirname(options.filename || '.'));
  this.stack.push(this.global = new Frame(root));
  this.warnings = options.warn;
  this.options = options;
  this.calling = []; // TODO: remove, use stack
  this.importStack = [];
  this.requireHistory = {};
  this.return = 0;
};

/**
 * Inherit from `Visitor.prototype`.
 */

Evaluator.prototype.__proto__ = Visitor.prototype;

/**
 * Proxy visit to expose node line numbers.
 *
 * @param {Node} node
 * @return {Node}
 * @api private
 */

var visit = Visitor.prototype.visit;
Evaluator.prototype.visit = function(node){
  try {
    return visit.call(this, node);
  } catch (err) {
    if (err.filename) throw err;
    err.lineno = node.lineno;
    err.column = node.column;
    err.filename = node.filename;
    err.stylusStack = this.stack.toString();
    try {
      err.input = fs.readFileSync(err.filename, 'utf8');
    } catch (err) {
      // ignore
    }
    throw err;
  }
};

/**
 * Perform evaluation setup:
 *
 *   - populate global scope
 *   - iterate imports
 *
 * @api private
 */

Evaluator.prototype.setup = function(){
  var root = this.root;
  var imports = [];

  this.populateGlobalScope();
  this.imports.forEach(function(file){
    var expr = new nodes.Expression;
    expr.push(new nodes.String(file));
    imports.push(new nodes.Import(expr));
  }, this);

  root.nodes = imports.concat(root.nodes);
};

/**
 * Populate the global scope with:
 *
 *   - css colors
 *   - user-defined globals
 *
 * @api private
 */

Evaluator.prototype.populateGlobalScope = function(){
  var scope = this.global.scope;

  // colors
  Object.keys(colors).forEach(function(name){
    var color = colors[name]
      , rgba = new nodes.RGBA(color[0], color[1], color[2], color[3])
      , node = new nodes.Ident(name, rgba);
    rgba.name = name;
    scope.add(node);
  });

  // expose url function
  scope.add(new nodes.Ident(
    'embedurl',
    new nodes.Function('embedurl', require('../functions/url')({
      limit: false
    }))
  ));

  // user-defined globals
  var globals = this.globals;
  Object.keys(globals).forEach(function(name){
    var val = globals[name];
    if (!val.nodeName) val = new nodes.Literal(val);
    scope.add(new nodes.Ident(name, val));
  });
};

/**
 * Evaluate the tree.
 *
 * @return {Node}
 * @api private
 */

Evaluator.prototype.evaluate = function(){
  debug('eval %s', this.filename);
  this.setup();
  return this.visit(this.root);
};

/**
 * Visit Group.
 */

Evaluator.prototype.visitGroup = function(group){
  group.nodes = group.nodes.map(function(selector){
    selector.val = this.interpolate(selector);
    debug('ruleset %s', selector.val);
    return selector;
  }, this);

  group.block = this.visit(group.block);
  return group;
};

/**
 * Visit Return.
 */

Evaluator.prototype.visitReturn = function(ret){
  ret.expr = this.visit(ret.expr);
  throw ret;
};

/**
 * Visit Media.
 */

Evaluator.prototype.visitMedia = function(media){
  media.block = this.visit(media.block);
  media.val = this.visit(media.val);
  return media;
};

/**
 * Visit QueryList.
 */

Evaluator.prototype.visitQueryList = function(queries){
  var val, query;
  queries.nodes.forEach(this.visit, this);

  if (1 == queries.nodes.length) {
    query = queries.nodes[0];
    if (val = this.lookup(query.type)) {
      val = val.first.string;
      if (!val) return queries;
      var Parser = require('../parser')
        , parser = new Parser(val, this.options);
      queries = this.visit(parser.queries());
    }
  }
  return queries;
};

/**
 * Visit Query.
 */

Evaluator.prototype.visitQuery = function(node){
  node.predicate = this.visit(node.predicate);
  node.type = this.visit(node.type);
  node.nodes.forEach(this.visit, this);
  return node;
};

/**
 * Visit Feature.
 */

Evaluator.prototype.visitFeature = function(node){
  node.name = this.interpolate(node);
  if (node.expr) {
    this.return++;
    node.expr = this.visit(node.expr);
    this.return--;
  }
  return node;
};

/**
 * Visit Object.
 */

Evaluator.prototype.visitObject = function(obj){
  for (var key in obj.vals) {
    obj.vals[key] = this.visit(obj.vals[key]);
  }
  return obj;
};

/**
 * Visit Member.
 */

Evaluator.prototype.visitMember = function(node){
  var left = node.left
    , right = node.right
    , obj = this.visit(left).first;

  if ('object' != obj.nodeName) {
    throw new Error(left.toString() + ' has no property .' + right);
  }
  if (node.val) {
    this.return++;
    obj.set(right.name, this.visit(node.val));
    this.return--;
  }
  return obj.get(right.name);
};

/**
 * Visit Keyframes.
 */

Evaluator.prototype.visitKeyframes = function(keyframes){
  var val;
  if (keyframes.fabricated) return keyframes;
  keyframes.val = this.interpolate(keyframes).trim();
  if (val = this.lookup(keyframes.val)) {
    keyframes.val = val.first.string || val.first.name;
  }
  keyframes.block = this.visit(keyframes.block);

  if ('official' != keyframes.prefix) return keyframes;

  this.vendors.forEach(function(prefix){
    // IE never had prefixes for keyframes
    if ('ms' == prefix) return;
    var node = keyframes.clone();
    node.val = keyframes.val;
    node.prefix = prefix;
    node.block = keyframes.block;
    node.fabricated = true;
    this.currentBlock.push(node);
  }, this);

  return nodes.null;
};

/**
 * Visit Function.
 */

Evaluator.prototype.visitFunction = function(fn){
  // check local
  var local = this.stack.currentFrame.scope.lookup(fn.name);
  if (local) this.warn('local ' + local.nodeName + ' "' + fn.name + '" previously defined in this scope');

  // user-defined
  var user = this.functions[fn.name];
  if (user) this.warn('user-defined function "' + fn.name + '" is already defined');

  // BIF
  var bif = bifs[fn.name];
  if (bif) this.warn('built-in function "' + fn.name + '" is already defined');

  return fn;
};

/**
 * Visit Each.
 */

Evaluator.prototype.visitEach = function(each){
  this.return++;
  var expr = utils.unwrap(this.visit(each.expr))
    , len = expr.nodes.length
    , val = new nodes.Ident(each.val)
    , key = new nodes.Ident(each.key || '__index__')
    , scope = this.currentScope
    , block = this.currentBlock
    , vals = []
    , self = this
    , body
    , obj;
  this.return--;

  each.block.scope = false;

  function visitBody(key, val) {
    scope.add(val);
    scope.add(key);
    body = self.visit(each.block.clone());
    vals = vals.concat(body.nodes);
  }

  // for prop in obj
  if (1 == len && 'object' == expr.nodes[0].nodeName) {
    obj = expr.nodes[0];
    for (var prop in obj.vals) {
      val.val = new nodes.String(prop);
      key.val = obj.get(prop);
      visitBody(key, val);
    }
  } else {
    for (var i = 0; i < len; ++i) {
      val.val = expr.nodes[i];
      key.val = new nodes.Unit(i);
      visitBody(key, val);
    }
  }

  this.mixin(vals, block);
  return vals[vals.length - 1] || nodes.null;
};

/**
 * Visit Call.
 */

Evaluator.prototype.visitCall = function(call){
  debug('call %s', call);
  var fn = this.lookup(call.name)
    , literal
    , ret;

  // url()
  this.ignoreColors = 'url' == call.name;

  // Variable function
  if (fn && 'expression' == fn.nodeName) {
    fn = fn.nodes[0];
  }

  // Not a function? try user-defined or built-ins
  if (fn && 'function' != fn.nodeName) {
    fn = this.lookupFunction(call.name);
  }

  // Undefined function? render literal CSS
  if (!fn || fn.nodeName != 'function') {
    debug('%s is undefined', call);
    // Special case for `calc`
    if ('calc' == this.unvendorize(call.name)) {
      literal = call.args.nodes && call.args.nodes[0];
      if (literal) ret = new nodes.Literal(call.name + literal);
    } else {
      ret = this.literalCall(call);
    }
    this.ignoreColors = false;
    return ret;
  }

  this.calling.push(call.name);

  // Massive stack
  if (this.calling.length > 200) {
    throw new RangeError('Maximum stylus call stack size exceeded');
  }

  // First node in expression
  if ('expression' == fn.nodeName) fn = fn.first;

  // Evaluate arguments
  this.return++;
  var args = this.visit(call.args);

  for (var key in args.map) {
    args.map[key] = this.visit(args.map[key].clone());
  }
  this.return--;

  // Built-in
  if (fn.fn) {
    debug('%s is built-in', call);
    ret = this.invokeBuiltin(fn.fn, args);
  // User-defined
  } else if ('function' == fn.nodeName) {
    debug('%s is user-defined', call);
    // Evaluate mixin block
    if (call.block) call.block = this.visit(call.block);
    ret = this.invokeFunction(fn, args, call.block);
  }

  this.calling.pop();
  this.ignoreColors = false;
  return ret;
};

/**
 * Visit Ident.
 */

Evaluator.prototype.visitIdent = function(ident){
  var prop;
  // Property lookup
  if (ident.property) {
    if (prop = this.lookupProperty(ident.name)) {
      return this.visit(prop.expr.clone());
    }
    return nodes.null;
  // Lookup
  } else if (ident.val.isNull) {
    var val = this.lookup(ident.name);
    // Object or Block mixin
    if (val && ident.mixin) this.mixinNode(val);
    return val ? this.visit(val) : ident;
  // Assign
  } else {
    this.return++;
    ident.val = this.visit(ident.val);
    this.return--;
    this.currentScope.add(ident);
    return ident.val;
  }
};

/**
 * Visit BinOp.
 */

Evaluator.prototype.visitBinOp = function(binop){
  // Special-case "is defined" pseudo binop
  if ('is defined' == binop.op) return this.isDefined(binop.left);

  this.return++;
  // Visit operands
  var op = binop.op
    , left = this.visit(binop.left)
    , right = ('||' == op || '&&' == op)
      ? binop.right : this.visit(binop.right);

  // HACK: ternary
  var val = binop.val
    ? this.visit(binop.val)
    : null;
  this.return--;

  // Operate
  try {
    return this.visit(left.operate(op, right, val));
  } catch (err) {
    // disregard coercion issues in equality
    // checks, and simply return false
    if ('CoercionError' == err.name) {
      switch (op) {
        case '==':
          return nodes.false;
        case '!=':
          return nodes.true;
      }
    }
    throw err;
  }
};

/**
 * Visit UnaryOp.
 */

Evaluator.prototype.visitUnaryOp = function(unary){
  var op = unary.op
    , node = this.visit(unary.expr);

  if ('!' != op) {
    node = node.first.clone();
    utils.assertType(node, 'unit');
  }

  switch (op) {
    case '-':
      node.val = -node.val;
      break;
    case '+':
      node.val = +node.val;
      break;
    case '~':
      node.val = ~node.val;
      break;
    case '!':
      return node.toBoolean().negate();
  }

  return node;
};

/**
 * Visit TernaryOp.
 */

Evaluator.prototype.visitTernary = function(ternary){
  var ok = this.visit(ternary.cond).toBoolean();
  return ok.isTrue
    ? this.visit(ternary.trueExpr)
    : this.visit(ternary.falseExpr);
};

/**
 * Visit Expression.
 */

Evaluator.prototype.visitExpression = function(expr){
  for (var i = 0, len = expr.nodes.length; i < len; ++i) {
    expr.nodes[i] = this.visit(expr.nodes[i]);
  }

  // support (n * 5)px etc
  if (this.castable(expr)) expr = this.cast(expr);

  return expr;
};

/**
 * Visit Arguments.
 */

Evaluator.prototype.visitArguments = Evaluator.prototype.visitExpression;

/**
 * Visit Property.
 */

Evaluator.prototype.visitProperty = function(prop){
  var name = this.interpolate(prop)
    , fn = this.lookup(name)
    , call = fn && 'function' == fn.first.nodeName
    , literal = ~this.calling.indexOf(name)
    , _prop = this.property;

  // Function of the same name
  if (call && !literal && !prop.literal) {
    var args = nodes.Arguments.fromExpression(utils.unwrap(prop.expr.clone()));
    prop.name = name;
    this.property = prop;
    this.return++;
    this.property.expr = this.visit(prop.expr);
    this.return--;
    var ret = this.visit(new nodes.Call(name, args));
    this.property = _prop;
    return ret;
  // Regular property
  } else {
    this.return++;
    prop.name = name;
    prop.literal = true;
    this.property = prop;
    prop.expr = this.visit(prop.expr);
    this.property = _prop;
    this.return--;
    return prop;
  }
};

/**
 * Visit Root.
 */

Evaluator.prototype.visitRoot = function(block){
  // normalize cached imports
  if (block != this.root) {
    block.constructor = nodes.Block;
    return this.visit(block);
  }

  for (var i = 0; i < block.nodes.length; ++i) {
    block.index = i;
    block.nodes[i] = this.visit(block.nodes[i]);
  }
  return block;
};

/**
 * Visit Block.
 */

Evaluator.prototype.visitBlock = function(block){
  this.stack.push(new Frame(block));
  for (block.index = 0; block.index < block.nodes.length; ++block.index) {
    try {
      block.nodes[block.index] = this.visit(block.nodes[block.index]);
    } catch (err) {
      if ('return' == err.nodeName) {
        if (this.return) {
          this.stack.pop();
          throw err;
        } else {
          block.nodes[block.index] = err;
          break;
        }
      } else {
        throw err;
      }
    }
  }
  this.stack.pop();
  return block;
};

/**
 * Visit Atblock.
 */

Evaluator.prototype.visitAtblock = function(atblock){
  atblock.block = this.visit(atblock.block);
  return atblock;
};

/**
 * Visit Atrule.
 */

Evaluator.prototype.visitAtrule = function(atrule){
  atrule.val = this.interpolate(atrule);
  if (atrule.block) atrule.block = this.visit(atrule.block);
  return atrule;
};

/**
 * Visit Supports.
 */

Evaluator.prototype.visitSupports = function(node){
  var condition = node.condition
    , val;

  this.return++;
  node.condition = this.visit(condition);
  this.return--;

  val = condition.first;
  if (1 == condition.nodes.length
    && 'string' == val.nodeName) {
    node.condition = val.string;
  }
  node.block = this.visit(node.block);
  return node;
};

/**
 * Visit If.
 */

Evaluator.prototype.visitIf = function(node){
  var ret
    , block = this.currentBlock
    , negate = node.negate;

  this.return++;
  var ok = this.visit(node.cond).first.toBoolean();
  this.return--;

  node.block.scope = node.block.hasMedia;

  // Evaluate body
  if (negate) {
    // unless
    if (ok.isFalse) {
      ret = this.visit(node.block);
    }
  } else {
    // if
    if (ok.isTrue) {
      ret = this.visit(node.block);
    // else
    } else if (node.elses.length) {
      var elses = node.elses
        , len = elses.length
        , cond;
      for (var i = 0; i < len; ++i) {
        // else if
        if (elses[i].cond) {
          elses[i].block.scope = elses[i].block.hasMedia;
          this.return++;
          cond = this.visit(elses[i].cond).first.toBoolean();
          this.return--;
          if (cond.isTrue) {
            ret = this.visit(elses[i].block);
            break;
          }
        // else
        } else {
          elses[i].scope = elses[i].hasMedia;
          ret = this.visit(elses[i]);
        }
      }
    }
  }

  // mixin conditional statements within
  // a selector group or at-rule
  if (ret && !node.postfix && block.node
    && ~['group'
       , 'atrule'
       , 'media'
       , 'supports'
       , 'keyframes'].indexOf(block.node.nodeName)) {
    this.mixin(ret.nodes, block);
    return nodes.null;
  }

  return ret || nodes.null;
};

/**
 * Visit Extend.
 */

Evaluator.prototype.visitExtend = function(extend){
  var block = this.currentBlock;
  if ('group' != block.node.nodeName) block = this.closestGroup;
  extend.selectors.forEach(function(selector){
    block.node.extends.push({
      // Cloning the selector for when we are in a loop and don't want it to affect
      // the selector nodes and cause the values to be different to expected
      selector: this.interpolate(selector.clone()).trim(),
      optional: selector.optional,
      lineno: selector.lineno,
      column: selector.column
    });
  }, this);
  return nodes.null;
};

/**
 * Visit Import.
 */

Evaluator.prototype.visitImport = function(imported){
  this.return++;

  var path = this.visit(imported.path).first
    , nodeName = imported.once ? 'require' : 'import'
    , found
    , literal;

  this.return--;
  debug('import %s', path);

  // url() passed
  if ('url' == path.name) {
    if (imported.once) throw new Error('You cannot @require a url');

    return imported;
  }

  // Ensure string
  if (!path.string) throw new Error('@' + nodeName + ' string expected');

  var name = path = path.string;

  // Absolute URL or hash
  if (/(?:url\s*\(\s*)?['"]?(?:#|(?:https?:)?\/\/)/i.test(path)) {
    if (imported.once) throw new Error('You cannot @require a url');
    return imported;
  }

  // Literal
  if (/\.css(?:"|$)/.test(path)) {
    literal = true;
    if (!imported.once && !this.includeCSS) {
      return imported;
    }
  }

  // support optional .styl
  if (!literal && !/\.styl$/i.test(path)) path += '.styl';

  // Lookup
  found = utils.find(path, this.paths, this.filename);
  if (!found) {
    found = utils.lookupIndex(name, this.paths, this.filename);
  }

  // Throw if import failed
  if (!found) throw new Error('failed to locate @' + nodeName + ' file ' + path);
  
  var block = new nodes.Block;

  for (var i = 0, len = found.length; i < len; ++i) {
    block.push(importFile.call(this, imported, found[i], literal));
  }

  return block;
};

/**
 * Invoke `fn` with `args`.
 *
 * @param {Function} fn
 * @param {Array} args
 * @return {Node}
 * @api private
 */

Evaluator.prototype.invokeFunction = function(fn, args, content){
  var block = new nodes.Block(fn.block.parent);

  // Clone the function body
  // to prevent mutation of subsequent calls
  var body = fn.block.clone(block);

  // mixin block
  var mixinBlock = this.stack.currentFrame.block;

  // new block scope
  this.stack.push(new Frame(block));
  var scope = this.currentScope;

  // normalize arguments
  if ('arguments' != args.nodeName) {
    var expr = new nodes.Expression;
    expr.push(args);
    args = nodes.Arguments.fromExpression(expr);
  }

  // arguments local
  scope.add(new nodes.Ident('arguments', args));

  // mixin scope introspection
  scope.add(new nodes.Ident('mixin', this.return
    ? nodes.false
    : new nodes.String(mixinBlock.nodeName)));

  // current property
  if (this.property) {
    var prop = this.propertyExpression(this.property, fn.name);
    scope.add(new nodes.Ident('current-property', prop));
  } else {
    scope.add(new nodes.Ident('current-property', nodes.null));
  }

  // current call stack
  var expr = new nodes.Expression;
  for (var i = this.calling.length - 1; i-- ; ) {
    expr.push(new nodes.Literal(this.calling[i]));
  };
  scope.add(new nodes.Ident('called-from', expr));

  // inject arguments as locals
  var i = 0
    , len = args.nodes.length;
  fn.params.nodes.forEach(function(node){
    // rest param support
    if (node.rest) {
      node.val = new nodes.Expression;
      for (; i < len; ++i) node.val.push(args.nodes[i]);
      node.val.preserve = true;
      node.val.isList = args.isList;
    // argument default support
    } else {
      var arg = args.map[node.name] || args.nodes[i++];
      node = node.clone();
      if (arg) {
        arg.isEmpty ? args.nodes[i - 1] = this.visit(node) : node.val = arg;
      } else {
        args.push(node.val);
      }

      // required argument not satisfied
      if (node.val.isNull) {
        throw new Error('argument "' + node + '" required for ' + fn);
      }
    }

    scope.add(node);
  }, this);

  // mixin block
  if (content) scope.add(new nodes.Ident('block', content, true));

  // invoke
  return this.invoke(body, true, fn.filename);
};

/**
 * Invoke built-in `fn` with `args`.
 *
 * @param {Function} fn
 * @param {Array} args
 * @return {Node}
 * @api private
 */

Evaluator.prototype.invokeBuiltin = function(fn, args){
  // Map arguments to first node
  // providing a nicer js api for
  // BIFs. Functions may specify that
  // they wish to accept full expressions
  // via .raw
  if (fn.raw) {
    args = args.nodes;
  } else {
    args = utils.params(fn).reduce(function(ret, param){
      var arg = args.map[param] || args.nodes.shift()
      if (arg) {
        arg = utils.unwrap(arg);
        var len = arg.nodes.length;
        if (len > 1) {
          for (var i = 0; i < len; ++i) {
            ret.push(utils.unwrap(arg.nodes[i].first));
          }
        } else {
          ret.push(arg.first);
        }
      }
      return ret;
    }, []);
  }

  // Invoke the BIF
  var body = utils.coerce(fn.apply(this, args));

  // Always wrapping allows js functions
  // to return several values with a single
  // Expression node
  var expr = new nodes.Expression;
  expr.push(body);
  body = expr;

  // Invoke
  return this.invoke(body);
};

/**
 * Invoke the given function `body`.
 *
 * @param {Block} body
 * @return {Node}
 * @api private
 */

Evaluator.prototype.invoke = function(body, stack, filename){
  var self = this
    , ret;

  if (filename) this.paths.push(dirname(filename));

  // Return
  if (this.return) {
    ret = this.eval(body.nodes);
    if (stack) this.stack.pop();
  // Mixin
  } else {
    body = this.visit(body);
    if (stack) this.stack.pop();
    this.mixin(body.nodes, this.currentBlock);
    ret = nodes.null;
  }

  if (filename) this.paths.pop();

  return ret;
};

/**
 * Mixin the given `nodes` to the given `block`.
 *
 * @param {Array} nodes
 * @param {Block} block
 * @api private
 */

Evaluator.prototype.mixin = function(nodes, block){
  if (!nodes.length) return;
  var len = block.nodes.length
    , head = block.nodes.slice(0, block.index)
    , tail = block.nodes.slice(block.index + 1, len);
  this._mixin(nodes, head, block);
  block.index = 0;
  block.nodes = head.concat(tail);
};

/**
 * Mixin the given `items` to the `dest` array.
 *
 * @param {Array} items
 * @param {Array} dest
 * @param {Block} block
 * @api private
 */

Evaluator.prototype._mixin = function(items, dest, block){
  var node
    , len = items.length;
  for (var i = 0; i < len; ++i) {
    switch ((node = items[i]).nodeName) {
      case 'return':
        return;
      case 'block':
        this._mixin(node.nodes, dest, block);
        break;
      case 'media':
        // fix link to the parent block
        var parentNode = node.block.parent.node;
        if (parentNode && 'call' != parentNode.nodeName) {
          node.block.parent = block;
        }
      case 'property':
        var val = node.expr;
        // prevent `block` mixin recursion
        if (node.literal && 'block' == val.first.name) {
          val = utils.unwrap(val);
          val.nodes[0] = new nodes.Literal('block');
        }
      default:
        dest.push(node);
    }
  }
};

/**
 * Mixin the given `node` to the current block.
 *
 * @param {Node} node
 * @api private
 */

Evaluator.prototype.mixinNode = function(node){
  node = this.visit(node.first);
  switch (node.nodeName) {
    case 'object':
      this.mixinObject(node);
      return nodes.null;
    case 'block':
    case 'atblock':
      this.mixin(node.nodes, this.currentBlock);
      return nodes.null;
  }
};

/**
 * Mixin the given `object` to the current block.
 *
 * @param {Object} object
 * @api private
 */

Evaluator.prototype.mixinObject = function(object){
  var Parser = require('../parser')
    , root = this.root
    , str = '$block ' + object.toBlock()
    , parser = new Parser(str, utils.merge({ root: block }, this.options))
    , block;

  try {
    block = parser.parse();
  } catch (err) {
    err.filename = this.filename;
    err.lineno = parser.lexer.lineno;
    err.column = parser.lexer.column;
    err.input = str;
    throw err;
  }

  block.parent = root;
  block.scope = false;
  var ret = this.visit(block)
    , vals = ret.first.nodes;
  for (var i = 0, len = vals.length; i < len; ++i) {
    if (vals[i].block) {
      this.mixin(vals[i].block.nodes, this.currentBlock);
      break;
    }
  }
};

/**
 * Evaluate the given `vals`.
 *
 * @param {Array} vals
 * @return {Node}
 * @api private
 */

Evaluator.prototype.eval = function(vals){
  if (!vals) return nodes.null;
  var len = vals.length
    , node = nodes.null;

  try {
    for (var i = 0; i < len; ++i) {
      node = vals[i];
      switch (node.nodeName) {
        case 'if':
          if ('block' != node.block.nodeName) {
            node = this.visit(node);
            break;
          }
        case 'each':
        case 'block':
          node = this.visit(node);
          if (node.nodes) node = this.eval(node.nodes);
          break;
        default:
          node = this.visit(node);
      }
    }
  } catch (err) {
    if ('return' == err.nodeName) {
      return err.expr;
    } else {
      throw err;
    }
  }

  return node;
};

/**
 * Literal function `call`.
 *
 * @param {Call} call
 * @return {call}
 * @api private
 */

Evaluator.prototype.literalCall = function(call){
  call.args = this.visit(call.args);
  return call;
};

/**
 * Lookup property `name`.
 *
 * @param {String} name
 * @return {Property}
 * @api private
 */

Evaluator.prototype.lookupProperty = function(name){
  var i = this.stack.length
    , index = this.currentBlock.index
    , top = i
    , nodes
    , block
    , len
    , other;

  while (i--) {
    block = this.stack[i].block;
    if (!block.node) continue;
    switch (block.node.nodeName) {
      case 'group':
      case 'function':
      case 'if':
      case 'each':
      case 'atrule':
      case 'media':
      case 'atblock':
      case 'call':
        nodes = block.nodes;
        // scan siblings from the property index up
        if (i + 1 == top) {
          while (index--) {
            // ignore current property
            if (this.property == nodes[index]) continue;
            other = this.interpolate(nodes[index]);
            if (name == other) return nodes[index].clone();
          }
        // sequential lookup for non-siblings (for now)
        } else {
          len = nodes.length;
          while (len--) {
            if ('property' != nodes[len].nodeName
              || this.property == nodes[len]) continue;
            other = this.interpolate(nodes[len]);
            if (name == other) return nodes[len].clone();
          }
        }
        break;
    }
  }

  return nodes.null;
};

/**
 * Return the closest mixin-able `Block`.
 *
 * @return {Block}
 * @api private
 */

Evaluator.prototype.__defineGetter__('closestBlock', function(){
  var i = this.stack.length
    , block;
  while (i--) {
    block = this.stack[i].block;
    if (block.node) {
      switch (block.node.nodeName) {
        case 'group':
        case 'keyframes':
        case 'atrule':
        case 'atblock':
        case 'media':
        case 'call':
          return block;
      }
    }
  }
});

/**
 * Return the closest group block.
 *
 * @return {Block}
 * @api private
 */

Evaluator.prototype.__defineGetter__('closestGroup', function(){
  var i = this.stack.length
    , block;
  while (i--) {
    block = this.stack[i].block;
    if (block.node && 'group' == block.node.nodeName) {
      return block;
    }
  }
});

/**
 * Return the current selectors stack.
 *
 * @return {Array}
 * @api private
 */

Evaluator.prototype.__defineGetter__('selectorStack', function(){
  var block
    , stack = [];
  for (var i = 0, len = this.stack.length; i < len; ++i) {
    block = this.stack[i].block;
    if (block.node && 'group' == block.node.nodeName) {
      block.node.nodes.forEach(function(selector) {
        if (!selector.val) selector.val = this.interpolate(selector);
      }, this);
      stack.push(block.node.nodes);
    }
  }
  return stack;
});

/**
 * Lookup `name`, with support for JavaScript
 * functions, and BIFs.
 *
 * @param {String} name
 * @return {Node}
 * @api private
 */

Evaluator.prototype.lookup = function(name){
  var val;
  if (this.ignoreColors && name in colors) return;
  if (val = this.stack.lookup(name)) {
    return utils.unwrap(val);
  } else {
    return this.lookupFunction(name);
  }
};

/**
 * Map segments in `node` returning a string.
 *
 * @param {Node} node
 * @return {String}
 * @api private
 */

Evaluator.prototype.interpolate = function(node){
  var self = this
    , isSelector = ('selector' == node.nodeName);
  function toString(node) {
    switch (node.nodeName) {
      case 'function':
      case 'ident':
        return node.name;
      case 'literal':
      case 'string':
        if (self.prefix && !node.prefixed && !node.val.nodeName) {
          node.val = node.val.replace(/\./g, '.' + self.prefix);
          node.prefixed = true;
        }
        return node.val;
      case 'unit':
        // Interpolation inside keyframes
        return '%' == node.type ? node.val + '%' : node.val;
      case 'member':
        return toString(self.visit(node));
      case 'expression':
        // Prevent cyclic `selector()` calls.
        if (self.calling && ~self.calling.indexOf('selector') && self._selector) return self._selector;
        self.return++;
        var ret = toString(self.visit(node).first);
        self.return--;
        if (isSelector) self._selector = ret;
        return ret;
    }
  }

  if (node.segments) {
    return node.segments.map(toString).join('');
  } else {
    return toString(node);
  }
};

/**
 * Lookup JavaScript user-defined or built-in function.
 *
 * @param {String} name
 * @return {Function}
 * @api private
 */

Evaluator.prototype.lookupFunction = function(name){
  var fn = this.functions[name] || bifs[name];
  if (fn) return new nodes.Function(name, fn);
};

/**
 * Check if the given `node` is an ident, and if it is defined.
 *
 * @param {Node} node
 * @return {Boolean}
 * @api private
 */

Evaluator.prototype.isDefined = function(node){
  if ('ident' == node.nodeName) {
    return nodes.Boolean(this.lookup(node.name));
  } else {
    throw new Error('invalid "is defined" check on non-variable ' + node);
  }
};

/**
 * Return `Expression` based on the given `prop`,
 * replacing cyclic calls to the given function `name`
 * with "__CALL__".
 *
 * @param {Property} prop
 * @param {String} name
 * @return {Expression}
 * @api private
 */

Evaluator.prototype.propertyExpression = function(prop, name){
  var expr = new nodes.Expression
    , val = prop.expr.clone();

  // name
  expr.push(new nodes.String(prop.name));

  // replace cyclic call with __CALL__
  function replace(node) {
    if ('call' == node.nodeName && name == node.name) {
      return new nodes.Literal('__CALL__');
    }

    if (node.nodes) node.nodes = node.nodes.map(replace);
    return node;
  }

  replace(val);
  expr.push(val);
  return expr;
};

/**
 * Cast `expr` to the trailing ident.
 *
 * @param {Expression} expr
 * @return {Unit}
 * @api private
 */

Evaluator.prototype.cast = function(expr){
  return new nodes.Unit(expr.first.val, expr.nodes[1].name);
};

/**
 * Check if `expr` is castable.
 *
 * @param {Expression} expr
 * @return {Boolean}
 * @api private
 */

Evaluator.prototype.castable = function(expr){
  return 2 == expr.nodes.length
    && 'unit' == expr.first.nodeName
    && ~units.indexOf(expr.nodes[1].name);
};

/**
 * Warn with the given `msg`.
 *
 * @param {String} msg
 * @api private
 */

Evaluator.prototype.warn = function(msg){
  if (!this.warnings) return;
  console.warn('\u001b[33mWarning:\u001b[0m ' + msg);
};

/**
 * Return the current `Block`.
 *
 * @return {Block}
 * @api private
 */

Evaluator.prototype.__defineGetter__('currentBlock', function(){
  return this.stack.currentFrame.block;
});

/**
 * Return an array of vendor names.
 *
 * @return {Array}
 * @api private
 */

Evaluator.prototype.__defineGetter__('vendors', function(){
  return this.lookup('vendors').nodes.map(function(node){
    return node.string;
  });
});

/**
 * Return the property name without vendor prefix.
 *
 * @param {String} prop
 * @return {String}
 * @api public
 */

Evaluator.prototype.unvendorize = function(prop){
  for (var i = 0, len = this.vendors.length; i < len; i++) {
    if ('official' != this.vendors[i]) {
      var vendor = '-' + this.vendors[i] + '-';
      if (~prop.indexOf(vendor)) return prop.replace(vendor, '');
    }
  }
  return prop;
};

/**
 * Return the current frame `Scope`.
 *
 * @return {Scope}
 * @api private
 */

Evaluator.prototype.__defineGetter__('currentScope', function(){
  return this.stack.currentFrame.scope;
});

/**
 * Return the current `Frame`.
 *
 * @return {Frame}
 * @api private
 */

Evaluator.prototype.__defineGetter__('currentFrame', function(){
  return this.stack.currentFrame;
});
