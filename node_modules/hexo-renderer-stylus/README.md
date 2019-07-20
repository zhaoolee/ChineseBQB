# hexo-renderer-stylus

[![Build Status](https://travis-ci.org/hexojs/hexo-renderer-stylus.svg?branch=master)](https://travis-ci.org/hexojs/hexo-renderer-stylus)  [![NPM version](https://badge.fury.io/js/hexo-renderer-stylus.svg)](http://badge.fury.io/js/hexo-renderer-stylus) [![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-renderer-stylus.svg)](https://coveralls.io/r/hexojs/hexo-renderer-stylus?branch=master)

Add support for [Stylus] with [nib].

## Install

``` bash
$ npm install hexo-renderer-stylus --save
```

- Hexo 3: >= 0.2
- Hexo 2: 0.1.x

## Options

You can configure this plugin in `_config.yml`.

``` yaml
stylus:
  compress: false
  sourcemaps:
    comment: true
    inline: true
    sourceRoot: ''
    basePath: .
```

- **Stylus**:
  - **compress** - Compress generated CSS (default: `false`)


- **Sourcemaps**
  - **comment** - Adds a comment with the `sourceMappingURL` to the generated CSS (default: `true`)
  - **inline** - Inlines the sourcemap with full source text in base64 format (default: `false`)
  - **sourceRoot** - `sourceRoot` property of the generated sourcemap
  - **basePath** - Base path from which sourcemap and all sources are relative (default: `.`)

[Stylus]: http://stylus-lang.com/
[nib]: http://tj.github.io/nib/
