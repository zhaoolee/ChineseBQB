/**
 * include-raw.js | https://theme-next.org/docs/tag-plugins/
 */

/* global hexo */

'use strict';

var pathFn = require('path');
var fs = require('hexo-fs');

function includeRaw(args) {
  var path = pathFn.join(hexo.source_dir, args[0]);

  return fs.exists(path).then(function(exist) {
    if (!exist) {
      hexo.log.error('Include file not found!');
      return;
    }
    return fs.readFile(path).then(function(contents) {
      if (!contents) {
        hexo.log.warn('Include file empty.');
        return;
      }
      return contents;
    });
  });
}

hexo.extend.tag.register('include_raw', includeRaw, {ends: false, async: true});
