/**
 * button.js | https://theme-next.org/docs/tag-plugins/button
 */

/* global hexo */

'use strict';

function postButton(args) {
  args = args.join(' ').split(',');
  var url   = args[0];
  var text  = args[1] || '';
  var icon  = args[2] || '';
  var title = args[3] || '';

  if (!url) {
    hexo.log.warn('URL can NOT be empty');
  }

  text = text.trim();
  icon = icon.trim();
  title = title.trim();

  var result = [`<a class="btn" href="${url}"`];
  title.length > 0 && result.push(` title="${title}"`);
  result.push('>');
  icon.length > 0 && result.push(`<i class="fa fa-${icon}"></i>`);
  text.length > 0 && result.push(text);
  result.push('</a>');

  return result.join('');
}

hexo.extend.tag.register('button', postButton, {ends: false});
hexo.extend.tag.register('btn', postButton, {ends: false});
