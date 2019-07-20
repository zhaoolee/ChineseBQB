/* global hexo */

'use strict';

var assign = require('object-assign');

hexo.config.topindex_generator = assign({
  per_page: typeof hexo.config.per_page === 'undefined' ? 10 : hexo.config.per_page,
  order_by: '-date'
}, hexo.config.topindex_generator);

hexo.extend.generator.register('topindex', require('./lib/generator'));
