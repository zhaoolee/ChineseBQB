var merge = require('utils-merge');
var pathFn = require('path');

var config = hexo.config.baidusitemap = merge({
  path: 'baidusitemap.xml'
}, hexo.config.baidusitemap);

if (!pathFn.extname(config.path)){
  config.path += '.xml';
}

hexo.extend.generator.register('baidusitemap', require('./lib/generator'));
