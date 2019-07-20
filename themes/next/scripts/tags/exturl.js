/**
 * exturl.js | https://theme-next.org/docs/tag-plugins/exturl
 * Note: need to remove in NexT v7.0.0
 */

/* global hexo */

'use strict';

var util = require('hexo-util');
var htmlTag = util.htmlTag;

/* eslint-disable */
var rUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\w]*))?)/;

// Create Base64 Object
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}};
/* eslint-enable */

function extURL(args) {
  var exturl = 'exturl';
  var url    = '';
  var text   = [];
  var title  = '';
  var item   = '';
  var i      = 0;
  var len    = args.length;

  // Find link URL and text
  for (; i < len; i++) {
    item = args[i];

    if (rUrl.test(item)) {
      url = Base64.encode(item);
      break;
    } else {
      text.push(item);
    }
  }

  // Delete link URL and text from arguments
  args = args.slice(i + 1);

  // If any arguments exists, collect the last text as the link title,
  // if not, set title as url.
  if (args.length) {
    title = args.join(' ');
  } else {
    title = item;
  }

  var attrs = {
    class     : exturl,
    'data-url': url,
    title     : title
  };
  hexo.log.warn('WARNING: `exturl` and `extlink` tag will not longer be supported. More info here: https://theme-next.org/docs/theme-settings/seo#ExtURL');
  return htmlTag('span', attrs, text.join(' ') + '<i class="fa fa-external-link"></i>');
}

hexo.extend.tag.register('exturl', extURL, {ends: false});
hexo.extend.tag.register('extlink', extURL, {ends: false});
