/**
 * group-pictures.js | https://theme-next.org/docs/tag-plugins/group-pictures
 */

/* global hexo */

'use strict';

var LAYOUTS = {
  2: {
    1: [1, 1],
    2: [2]
  },
  3: {
    1: [3],
    2: [1, 2],
    3: [2, 1]
  },
  4: {
    1: [1, 2, 1],
    2: [1, 3],
    3: [2, 2],
    4: [3, 1]
  },
  5: {
    1: [1, 2, 2],
    2: [2, 1, 2],
    3: [2, 3],
    4: [3, 2]
  },
  6: {
    1: [1, 2, 3],
    2: [1, 3, 2],
    3: [2, 1, 3],
    4: [2, 2, 2],
    5: [3, 3]
  },
  7: {
    1: [1, 2, 2, 2],
    2: [1, 3, 3],
    3: [2, 2, 3],
    4: [2, 3, 2],
    5: [3, 2, 2]
  },
  8: {
    1: [1, 2, 2, 3],
    2: [1, 2, 3, 2],
    3: [1, 3, 2, 2],
    4: [2, 2, 2, 2],
    5: [2, 3, 3],
    6: [3, 2, 3],
    7: [3, 3, 2]
  },
  9: {
    1: [1, 2, 3, 3],
    2: [1, 3, 2, 3],
    3: [2, 2, 2, 3],
    4: [2, 2, 3, 2],
    5: [2, 3, 2, 2],
    6: [3, 2, 2, 2],
    7: [3, 3, 3]
  },
  10: {
    1: [1, 3, 3, 3],
    2: [2, 2, 3, 3],
    3: [2, 3, 2, 3],
    4: [2, 3, 3, 2],
    5: [3, 2, 2, 3],
    6: [3, 2, 3, 2],
    7: [3, 3, 2, 2]
  }
};

function groupBy(group, data) {
  var r = [];
  for (var i = 0; i < group.length; i++) {
    r.push(data.slice(0, group[i]));
    data = data.slice(group[i]);
  }
  return r;
}

var templates = {

  dispatch: function(pictures, group, layout) {
    var rule = LAYOUTS[group] ? LAYOUTS[group][layout] : null;
    return rule ? this.getHTML(groupBy(rule, pictures)) : templates.defaults(pictures);
  },

  /**
   * Defaults Layout
   *
   * □ □ □
   * □ □ □
   * ...
   *
   * @param pictures
   */
  defaults: function(pictures) {
    var ROW_SIZE = 3;
    var rows = pictures.length / (ROW_SIZE + 1);
    var pictureArr = [];

    for (var i = 0; i < rows; i++) {
      pictureArr.push(pictures.slice(i * ROW_SIZE, (i + 1) * ROW_SIZE));
    }

    return this.getHTML(pictureArr);
  },

  getHTML: function(rows) {
    var rowHTML = '';

    for (var i = 0; i < rows.length; i++) {
      rowHTML += this.getRowHTML(rows[i]);
    }

    return `<div class="group-picture-container">${rowHTML}</div>`;
  },

  getRowHTML: function(pictures) {
    return `<div class="group-picture-row">${this.getColumnHTML(pictures)}</div>`;
  },

  getColumnHTML: function(pictures) {
    var columns = [];
    var columnWidth = 100 / pictures.length;
    var columnStyle = `style="width: ${columnWidth}%;"`;

    for (var i = 0; i < pictures.length; i++) {
      columns.push(`<div class="group-picture-column" ${columnStyle}>${pictures[i]}</div>`);
    }
    return columns.join('');
  }
};

function groupPicture(args, content) {
  args = args[0].split('-');
  var group = parseInt(args[0], 10);
  var layout = parseInt(args[1], 10);

  content = hexo.render.renderSync({text: content, engine: 'markdown'});

  var pictures = content.match(/<img[\s\S]*?>/g);

  return `<div class="group-picture">${templates.dispatch(pictures, group, layout)}</div>`;
}

hexo.extend.tag.register('grouppicture', groupPicture, {ends: true});
hexo.extend.tag.register('gp', groupPicture, {ends: true});
