/**
 * pdf.js | https://theme-next.org/docs/tag-plugins/pdf
 */

/* global hexo */

'use strict';

function pdf(args) {
  return `<div class="pdf" target="${args[0]}" height="${args[1] || ''}"></div>`;
}

hexo.extend.tag.register('pdf', pdf, {ends: false});
