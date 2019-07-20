/**
 * next-url.js | https://theme-next.org/api/helpers/next-url/
 */

/* global hexo */

'use strict';

hexo.extend.helper.register('next_url', function(path, text, options) {
  var htmlTag = require('hexo-util').htmlTag;
  var config = this.config;
  var url = require('url');
  var data = url.parse(path);
  var siteHost = url.parse(config.url).hostname || config.url;

  var theme = hexo.theme.config;
  var exturl = '';
  var tag = 'a';
  var attrs = { href: this.url_for(path) };

  // If `exturl` enabled, set spanned links only on external links.
  if (theme.exturl && data.protocol && data.hostname !== siteHost) {
    tag = 'span';
    exturl = 'exturl';
    var encoded = Buffer.from(path).toString('base64');
    attrs = {
      class     : exturl,
      'data-url': encoded
    };
  }

  options = options || {};

  var keys = Object.keys(options);
  var key = '';

  for (var i = 0, len = keys.length; i < len; i++) {
    key = keys[i];

    /**
     * If option have `class` attribute, add it to
     * 'exturl' class if `exturl` option enabled.
     */
    if (exturl !== '' && key === 'class') {
      attrs[key] += ' ' + options[key];
    } else {
      attrs[key] = options[key];
    }
  }

  if (attrs.class && Array.isArray(attrs.class)) {
    attrs.class = attrs.class.join(' ');
  }

  // If it's external link, rewrite attributes.
  if (data.protocol && data.hostname !== siteHost) {
    attrs.external = null;

    if (!theme.exturl) {
      // Only for simple link need to rewrite/add attributes.
      attrs.rel = 'noopener';
      attrs.target = '_blank';
    } else {
      // Remove rel attributes for `exturl` in main menu.
      attrs.rel = null;
    }
  }

  return htmlTag(tag, attrs, text);
});
