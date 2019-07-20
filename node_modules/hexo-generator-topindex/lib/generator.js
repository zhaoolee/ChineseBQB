'use strict';

var pagination = require('hexo-pagination');

module.exports = function(locals) {
  var config = this.config;
  var posts = locals.posts.sort(config.topindex_generator.order_by);

  var posts = locals.posts;
    posts.data = posts.data.sort(function(a, b) {
        if(a.top && b.top) {
            if(a.top == b.top) return b.date - a.date;
            else return b.top - a.top;
        }
        else if(a.top && !b.top) {
            return -1;
        }
        else if(!a.top && b.top) {
            return 1;
        }
        else return b.date - a.date;
    });

  var paginationDir = config.pagination_dir || 'page';

  return pagination('', posts, {
    perPage: config.topindex_generator.per_page,
    layout: ['index', 'archive'],
    format: paginationDir + '/%d/',
    data: {
      __index: true
    }
  });
};
