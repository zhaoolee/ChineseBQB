/* global hexo */

'use strict';

hexo.extend.filter.register('after_post_render', function(data) {
  var theme = hexo.theme.config;
  // Exit if `exturl` option disable in NexT.
  if (!theme.exturl) return;

  var url = require('url');
  var cheerio;

  var config = this.config;

  if (!cheerio) cheerio = require('cheerio');

  var $ = cheerio.load(data.content, {decodeEntities: false});
  var siteHost = url.parse(config.url).hostname || config.url;

  $('a').each(function() {
    var href = $(this).attr('href');
    // Exit if the href attribute doesn't exists.
    if (!href) return;

    var data = url.parse(href);

    // Exit if the link doesn't have protocol, which means it's an internal link.
    if (!data.protocol) return;

    // Exit if the url has same host with `config.url`.
    if (data.hostname === siteHost) return;

    // If title atribute filled, set it as title; if not, set url as title.
    var title = $(this).attr('title') || href;

    var encoded = Buffer.from(href).toString('base64');

    $(this).replaceWith(function() {
      return $(`<span class="exturl" data-url="${encoded}" title="${title}">${$(this).html()}<i class="fa fa-external-link"></i></span>`);
    });

  });

  data.content = $.html();
}, 0);
