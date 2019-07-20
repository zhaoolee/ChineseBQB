var merge = require('utils-merge');
var pathFn = require('path');

var config = hexo.config.search = merge({
	path: 'search.xml',
	field: 'post',
    format: 'html',
    limit: '10000'
}, hexo.config.search);

// Set default search path
if (!config.path){
  config.path = 'search.xml';
}

// Add extension name if don't have
if (!pathFn.extname(config.path)){
  config.path += '.xml';
}

if (pathFn.extname(config.path)=='.xml') {
	hexo.extend.generator.register('xml', require('./lib/xml_generator'));
}

if (pathFn.extname(config.path)=='.json') {    
	hexo.extend.generator.register('json', require('./lib/json_generator'));
}
