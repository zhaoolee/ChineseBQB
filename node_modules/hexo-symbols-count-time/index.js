'use strict';

if (hexo.config.symbols_count_time) {

  var helper = require('./lib/helper');

  if (hexo.config.symbols_count_time.symbols) {
    hexo.extend.helper.register('symbolsCount', helper.symbolsCount);
  }

  if (hexo.config.symbols_count_time.time) {
    hexo.extend.helper.register('symbolsTime', helper.symbolsTime);
  }

  if (hexo.config.symbols_count_time.total_symbols) {
    hexo.extend.helper.register('symbolsCountTotal', helper.symbolsCountTotal);
  }

  if (hexo.config.symbols_count_time.total_time) {
    hexo.extend.helper.register('symbolsTimeTotal', helper.symbolsTimeTotal);
  }

  if (hexo.config.symbols_count_time.symbols || hexo.config.symbols_count_time.time || hexo.config.symbols_count_time.total_symbols || hexo.config.symbols_count_time.total_time) {
    hexo.extend.filter.register('after_post_render', function(data) {
      var util = require('hexo-util');
      var stripHTML = util.stripHTML;
      var content = data.content.replace(/<td class=\"gutter\">.*?<\/td>/g, "");
      if (hexo.config.symbols_count_time.exclude_codeblock) content = content.replace(/<td class=\"code\">.*?<\/td>/g, "");
      data.length = stripHTML(content).length;
    }, 0);
  }

}
