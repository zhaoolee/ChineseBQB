/* global hexo */
'use strict';

var assign = require('object-assign');
var pathFn = require('path');

var config = hexo.config.sitemap = assign({
  path: 'sitemap.xml'
}, hexo.config.sitemap);

if (!pathFn.extname(config.path)) {
  config.path += '.xml';
}

hexo.extend.generator.register('sitemap', require('./lib/generator'));
