'use strict';

var stylus, nib;

function getProperty(obj, name) {
  name = name.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');

  var split = name.split('.');
  var key = split.shift();

  if (!obj.hasOwnProperty(key)) return '';

  var result = obj[key];
  var len = split.length;

  if (!len) return result || '';
  if (typeof result !== 'object') return '';

  for (var i = 0; i < len; i++) {
    key = split[i];
    if (!result.hasOwnProperty(key)) return '';

    result = result[split[i]];
    if (typeof result !== 'object') return result;
  }

  return result;
}

module.exports = function(data, options, callback) {
  // Lazy require
  if (!stylus) {
    stylus = require('stylus');
    nib = require('nib');
  }

  var config = this.config.stylus || {};
  var self = this;

  function defineConfig(style) {
    style.define('hexo-config', function(data) {
      return getProperty(self.theme.config, data.val);
    });
  }

  stylus(data.text)
    .use(nib())
    .use(defineConfig)
    .set('filename', data.path)
    .set('sourcemap', config.sourcemaps)
    .set('compress', config.compress)
    .set('include css', true)
    .render(callback);
};
