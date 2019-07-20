'use strict'; // A simple class system, more documentation to come

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var EventEmitter = require('events');

var lib = require('./lib');

function parentWrap(parent, prop) {
  if (typeof parent !== 'function' || typeof prop !== 'function') {
    return prop;
  }

  return function wrap() {
    // Save the current parent method
    var tmp = this.parent; // Set parent to the previous method, call, and restore

    this.parent = parent;
    var res = prop.apply(this, arguments);
    this.parent = tmp;
    return res;
  };
}

function extendClass(cls, name, props) {
  props = props || {};
  lib.keys(props).forEach(function (k) {
    props[k] = parentWrap(cls.prototype[k], props[k]);
  });

  var subclass =
  /*#__PURE__*/
  function (_cls) {
    _inheritsLoose(subclass, _cls);

    function subclass() {
      return _cls.apply(this, arguments) || this;
    }

    _createClass(subclass, [{
      key: "typename",
      get: function get() {
        return name;
      }
    }]);

    return subclass;
  }(cls);

  lib._assign(subclass.prototype, props);

  return subclass;
}

var Obj =
/*#__PURE__*/
function () {
  function Obj() {
    // Unfortunately necessary for backwards compatibility
    this.init.apply(this, arguments);
  }

  var _proto = Obj.prototype;

  _proto.init = function init() {};

  Obj.extend = function extend(name, props) {
    if (typeof name === 'object') {
      props = name;
      name = 'anonymous';
    }

    return extendClass(this, name, props);
  };

  _createClass(Obj, [{
    key: "typename",
    get: function get() {
      return this.constructor.name;
    }
  }]);

  return Obj;
}();

var EmitterObj =
/*#__PURE__*/
function (_EventEmitter) {
  _inheritsLoose(EmitterObj, _EventEmitter);

  function EmitterObj() {
    var _this2;

    var _this;

    _this = _EventEmitter.call(this) || this; // Unfortunately necessary for backwards compatibility

    (_this2 = _this).init.apply(_this2, arguments);

    return _this;
  }

  var _proto2 = EmitterObj.prototype;

  _proto2.init = function init() {};

  EmitterObj.extend = function extend(name, props) {
    if (typeof name === 'object') {
      props = name;
      name = 'anonymous';
    }

    return extendClass(this, name, props);
  };

  _createClass(EmitterObj, [{
    key: "typename",
    get: function get() {
      return this.constructor.name;
    }
  }]);

  return EmitterObj;
}(EventEmitter);

module.exports = {
  Obj: Obj,
  EmitterObj: EmitterObj
};