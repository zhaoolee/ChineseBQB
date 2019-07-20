'use strict';

var pagination = require('hexo-pagination');

module.exports = function(locals){
  var config = this.config;
  var perPage = config.category_generator.per_page;
  var paginationDir = config.pagination_dir || 'page';

  return locals.categories.reduce(function(result, category){
    if (!category.length) return result;

    var posts = category.posts.sort('-date');
    var data = pagination(category.path, posts, {
      perPage: perPage,
      layout: ['category', 'archive', 'index'],
      format: paginationDir + '/%d/',
      data: {
        category: category.name
      }
    });

    return result.concat(data);
  }, []);
};