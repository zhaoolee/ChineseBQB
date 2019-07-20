/* global hexo */

'use strict';

var assign = require('object-assign');

// when archive disabled pagination, per_page should be 0.
var per_page;

if (hexo.config.archive === 1) {
  per_page = 0;
} else if (typeof hexo.config.per_page === 'undefined') {
  per_page = 10;
} else {
  per_page = hexo.config.per_page;
}

hexo.config.archive_generator = assign({
  per_page: per_page,
  yearly: true,
  monthly: true,
  daily: false
}, hexo.config.archive_generator);

hexo.extend.generator.register('archive', require('./lib/generator'));
