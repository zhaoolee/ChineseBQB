var ejs = require('ejs');
var pathFn = require('path');
var fs = require('fs');
var striptags = require('striptags');

ejs.filters.cdata = function(str){
  return str ? '<![CDATA[' + striptags(str).trim().replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ') + ']]>' : '';
};

var searchTmplSrc = pathFn.join(__dirname, '../templates/xml.ejs');
var searchTmpl = ejs.compile(fs.readFileSync(searchTmplSrc, 'utf8'));

module.exports = function(locals){
  var config = this.config;
  var searchConfig = config.search;
  var template = searchTmpl;
  var searchfield = searchConfig.field.trim();
  var searchformat = searchConfig.format.trim();
  var searchlimit = searchConfig.limit;
  var posts, pages, raw;

  if(searchfield != ''){
    if(searchfield == 'post'){
      posts = locals.posts.sort('-date');
    }else if(searchfield == 'page'){
      pages = locals.pages;
    }else{
      posts = locals.posts.sort('-date');
      pages = locals.pages;
    }
  }else{
    posts = locals.posts.sort('-date');
  }
  if(searchformat != ''){
    if(['raw', 'excerpt', 'more'].indexOf(searchformat) > -1){
      raw = searchformat;
    }
  }

  var xml = template({
    config: config,
    posts: posts,
    pages: pages,
    raw: raw,
    limit: searchlimit,
    feed_url: config.root + searchConfig.path
  });

  return {
    path: searchConfig.path,
    data: xml
  };
};
