# hexo-pagination

[![Build Status](https://travis-ci.org/hexojs/hexo-pagination.svg?branch=master)](https://travis-ci.org/hexojs/hexo-pagination)  [![NPM version](https://badge.fury.io/js/hexo-pagination.svg)](http://badge.fury.io/js/hexo-pagination) [![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-pagination.svg)](https://coveralls.io/r/hexojs/hexo-pagination?branch=master)

Pagination utilities for [Hexo] generator plugins.

## Installation

``` bash
$ npm install hexo-pagination --save
```

## Usage

### pagination(base, posts, [options])

Option | Description | Default
--- | --- | ---
`perPage` | Posts displayed per page | 10
`format` | URL format | page/%d/
`layout` | Layout. This value can be a string or an array. | ['archive', 'index']
`data` | Extra data |

For example:

``` js
var pagination = require('hexo-pagination');

pagination('/tags/hexo', [], {
  perPage: 10,
  format: 'page/%d/',
  layout: ['archive', 'index'],
  data: {
    tag: 'hexo'
  }
});
```

This function returns an array containing objects with 3 properties: `path`, `layout`, `data`.

Data | Description
--- | --- | ---
`base` | Base URL
`total` | Total pages
`current` | Current page number
`current_url` | Path of the current page (which equals to `path`)
`posts` | The slice of posts for the current page
`prev` | Previous page number
`prev_link` | The path to the previous page
`next` | Next page number
`next_link` | The path to the next page

## License

MIT

[Hexo]: http://hexo.io/