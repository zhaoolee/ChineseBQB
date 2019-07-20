var merge = require('utils-merge');
var util = require('util');

function pagination(base, posts, options){
  if (typeof base !== 'string') throw new TypeError('base must be a string!');
  if (!posts) throw new TypeError('posts is required!');
  options = options || {};

  if (base && base[base.length - 1] !== '/') base += '/';

  var length = posts.length;
  var perPage = options.hasOwnProperty('perPage') ? +options.perPage : 10;
  var total = perPage ? Math.ceil(length / perPage) : 1;
  var format = options.format || 'page/%d/';
  var layout = options.layout || ['archive', 'index'];
  var data = options.data || {};
  var result = [];
  var urlCache = {};

  function formatURL(i){
    if (urlCache[i]) return urlCache[i];

    var url = base;
    if (i > 1) url += util.format(format, i);
    urlCache[i] = url;

    return url;
  }

  function makeData(i){
    var data = {
      base: base,
      total: total,
      current: i,
      current_url: formatURL(i),
      posts: perPage ? posts.slice(perPage * (i - 1), perPage * i) : posts,
      prev: 0,
      prev_link: '',
      next: 0,
      next_link: ''
    };

    if (i > 1){
      data.prev = i - 1;
      data.prev_link = formatURL(data.prev);
    }

    if (i < total){
      data.next = i + 1;
      data.next_link = formatURL(data.next);
    }

    return data;
  }

  if (perPage){
    for (var i = 1; i <= total; i++){
      result.push({
        path: formatURL(i),
        layout: layout,
        data: merge(makeData(i), data)
      });
    }
  } else {
    result.push({
      path: base,
      layout: layout,
      data: merge(makeData(1), data)
    });
  }

  return result;
}

module.exports = pagination;