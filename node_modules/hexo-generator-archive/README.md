# hexo-generator-archive

[![Build Status](https://travis-ci.org/hexojs/hexo-generator-archive.svg?branch=master)](https://travis-ci.org/hexojs/hexo-generator-archive)  [![NPM version](https://badge.fury.io/js/hexo-generator-archive.svg)](http://badge.fury.io/js/hexo-generator-archive) [![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-generator-archive.svg)](https://coveralls.io/r/hexojs/hexo-generator-archive?branch=master)

Archive generator for [Hexo].

## Installation

``` bash
$ npm install hexo-generator-archive --save
```

## Options

``` yaml
archive_generator:
  per_page: 10
  yearly: true
  monthly: true
  daily: false
  order_by: -date
```

- **per_page**: Posts displayed per page. (0 = disable pagination)
- **yearly**: Generate yearly archive.
- **monthly**: Generate monthly archive.
- **daily**: Generate daily archive.
- **order_by**: Posts order. (Order by date descending by default)

## License

MIT

[Hexo]: http://hexo.io/
