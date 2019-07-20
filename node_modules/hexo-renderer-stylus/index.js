/* global hexo */
'use strict';

var renderer = require('./lib/renderer');

hexo.extend.renderer.register('styl', 'css', renderer);
hexo.extend.renderer.register('stylus', 'css', renderer);
