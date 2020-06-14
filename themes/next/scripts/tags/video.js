/**
 * video.js | https://theme-next.org/docs/tag-plugins/video
 */

/* global hexo */

'use strict';

function postVideo(args) {
  return `<video src="${args}" preload="metadata" controls playsinline poster="">Sorry, your browser does not support the video tag.</video>`;
}

hexo.extend.tag.register('video', postVideo, {ends: false});
