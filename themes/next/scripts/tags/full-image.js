/**
 * full-image.js | https://theme-next.org/docs/tag-plugins/full-image
 */

/* global hexo */

'use strict';

function fullImage(args) {
  args = args.join(' ').split(',');
  var mixed = args[0].split('@');
  var img   = mixed[0];
  var src   = mixed[1] === 'lazy' ? '/images/loading.gif" data-original="' + img : img;
  var alt   = args[1] || '';
  var title = args[2] || '';
  var width = args[3] || '';

  if (!img) {
    hexo.log.warn('Image src can NOT be empty');
  }

  var image = [`<span itemprop="image" itemscope itemtype="http://schema.org/ImageObject"><img itemprop="url image" src="${src}" class="full-image"`];
  alt.length > 0 && image.push(`alt="${alt.trim()}"`);
  title.length > 0 && image.push(`title="${title.trim()}"`);
  width.length > 0 && image.push(`style="max-width: none; width:${width};"`);
  image.push('/><meta itemprop="width" content="auto"/><meta itemprop="height" content="auto"/></span>');

  return image.join(' ');
}

hexo.extend.tag.register('fullimage', fullImage, {ends: false});
hexo.extend.tag.register('fi', fullImage, {ends: false});
