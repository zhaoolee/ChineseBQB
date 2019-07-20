'use strict';

var pagination = require('hexo-pagination');

module.exports = function(locals) {
  var config = this.config;
  var perPage = config.tag_generator.per_page;
  var paginationDir = config.pagination_dir || 'page';
  var tags = locals.tags;
  var tagDir;

  var pages = tags.reduce(function(result, tag) {
    if (!tag.length) return result;

    var posts = tag.posts.sort('-date');
    var data = pagination(tag.path, posts, {
      perPage: perPage,
      layout: ['tag', 'archive', 'index'],
      format: paginationDir + '/%d/',
      data: {
        tag: tag.name
      }
    });

    return result.concat(data);
  }, []);

  // generate tag index page, usually /tags/index.html
  if (config.tag_generator.enable_index_page) {
    tagDir = config.tag_dir;
    if (tagDir[tagDir.length - 1] !== '/') {
      tagDir += '/';
    }

    pages.push({
      path: tagDir,
      layout: ['tag-index', 'tag', 'archive', 'index'],
      posts: locals.posts,
      data: {
        base: tagDir,
        total: 1,
        current: 1,
        current_url: tagDir,
        posts: locals.posts,
        prev: 0,
        prev_link: '',
        next: 0,
        next_link: '',
        tags: tags
      }
    });
  }

  return pages;
};
