/* global hexo */

'use strict';

var renderer = require('./lib/renderer');

hexo.config.marked = Object.assign({
  gfm: true,
  pedantic: false,
  sanitize: false,
  tables: true,
  breaks: true,
  smartLists: true,
  smartypants: true,
  modifyAnchors: '',
  autolink: true
}, hexo.config.marked);

hexo.extend.renderer.register('md', 'html', renderer, true);
hexo.extend.renderer.register('markdown', 'html', renderer, true);
hexo.extend.renderer.register('mkd', 'html', renderer, true);
hexo.extend.renderer.register('mkdn', 'html', renderer, true);
hexo.extend.renderer.register('mdwn', 'html', renderer, true);
hexo.extend.renderer.register('mdtxt', 'html', renderer, true);
hexo.extend.renderer.register('mdtext', 'html', renderer, true);
