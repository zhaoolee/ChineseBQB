'use strict';

var pathFn = require('path');
var fs = require('fs');
var sitemapTmpl;

module.exports = function(config) {
  if (sitemapTmpl) return sitemapTmpl;

  var nunjucks = require('nunjucks');
  var env = new nunjucks.Environment(null, {
    autoescape: false,
    watch: false
  });

  env.addFilter('uriencode', function(str) {
    return encodeURI(str);
  });

  var sitemapSrc = config.sitemap.template || pathFn.join(__dirname, '../sitemap.xml');
  sitemapTmpl = nunjucks.compile(fs.readFileSync(sitemapSrc, 'utf8'), env);

  return sitemapTmpl;
};
