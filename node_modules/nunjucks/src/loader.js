'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var path = require('path');

var _require = require('./object'),
    EmitterObj = _require.EmitterObj;

module.exports =
/*#__PURE__*/
function (_EmitterObj) {
  _inheritsLoose(Loader, _EmitterObj);

  function Loader() {
    return _EmitterObj.apply(this, arguments) || this;
  }

  var _proto = Loader.prototype;

  _proto.resolve = function resolve(from, to) {
    return path.resolve(path.dirname(from), to);
  };

  _proto.isRelative = function isRelative(filename) {
    return filename.indexOf('./') === 0 || filename.indexOf('../') === 0;
  };

  return Loader;
}(EmitterObj);