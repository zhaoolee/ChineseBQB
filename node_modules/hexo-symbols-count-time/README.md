<!--[cover-image]: https://coveralls.io/repos/github/theme-next/hexo-symbols-count-time/badge.svg?branch=master-->
[cover-image]: https://img.shields.io/coveralls/theme-next/hexo-symbols-count-time/master.svg
[travis-image]: https://travis-ci.org/theme-next/hexo-symbols-count-time.svg?branch=master
<!--[travis-image]: https://img.shields.io/travis/theme-next/hexo-symbols-count-time/master.svg-->
[appveyor-image]: https://ci.appveyor.com/api/projects/status/wuewa37rb7nknx31/branch/master?svg=true

[hexo-image]: https://img.shields.io/badge/hexo-%3E%3D%203.0-blue.svg
[node-image]: https://img.shields.io/node/v/hexo-symbols-count-time.svg
[dep-image]: https://david-dm.org/theme-next/hexo-symbols-count-time.svg
<!--[dep-image]: https://img.shields.io/david/theme-next/hexo-symbols-count-time.svg-->
<!--[dep-image]: https://img.shields.io/librariesio/github/theme-next/hexo-symbols-count-time.svg-->
[doc-image]: https://readthedocs.org/projects/hexo-symbols-count-time/badge/?version=latest
[rel-image]: https://img.shields.io/github/release/theme-next/hexo-symbols-count-time.svg
[size-image]: https://img.shields.io/github/size/theme-next/hexo-symbols-count-time/lib/helper.js.svg

[mnt-image]: https://img.shields.io/maintenance/yes/2019.svg
[npm-image]: https://badge.fury.io/js/hexo-symbols-count-time.svg
<!--[npm-image]: https://badge.fury.io/gh/theme-next%2Fhexo-symbols-count-time.svg-->
<!--[npm-image]: https://img.shields.io/npm/v/hexo-symbols-count-time.svg-->
[dm-image]: https://img.shields.io/npm/dm/hexo-symbols-count-time.svg
[dt-image]: https://img.shields.io/npm/dt/hexo-symbols-count-time.svg
[lic-image]: https://img.shields.io/npm/l/hexo-symbols-count-time.svg

[cover-url]: https://coveralls.io/github/theme-next/hexo-symbols-count-time?branch=master "Coverage of Tests"
[travis-url]: https://travis-ci.org/theme-next/hexo-symbols-count-time?branch=master "Travis CI [Linux]"
[appveyor-url]: https://ci.appveyor.com/project/ivan-nginx/hexo-symbols-count-time/branch/master "AppVeyor [Windows]"
[hexo-url]: https://hexo.io
[node-url]: https://nodejs.org/en/download/releases
[doc-url]: http://hexo-symbols-count-time.readthedocs.io/en/latest/?badge=latest
[npm-url]: https://www.npmjs.com/package/hexo-symbols-count-time

# hexo-symbols-count-time
[![cover-image]][cover-url]
[![travis-image]][travis-url]
[![appveyor-image]][appveyor-url]
[![hexo-image]][hexo-url]
[![node-image]][node-url]
[![npm-image]][npm-url]
[![mnt-image]](../../commits/master)
[![lic-image]](LICENSE)

Symbols count and time to read of articles.

Better than [`hexo-reading-time`](https://github.com/ierhyna/hexo-reading-time) and faster than [`hexo-worcount`](https://github.com/willin/hexo-wordcount). No external dependencies.

## Installation

[![size-image]](../../blob/master/lib/helper.js) <!--[![rel-image]](../../releases)-->
[![dm-image]][npm-url]
[![dt-image]][npm-url]

```bash
$ npm install hexo-symbols-count-time --save
```

## Usage

Activate this plugin in **hexo's `_config.yml`** (which locates in the root dir of your blog) by enabled any option:

```yml
symbols_count_time:
  symbols: true
  time: true
  total_symbols: true
  total_time: true
  exclude_codeblock: false
```

If `symbols_count_time` not specified (or commented), plugin will totally disabled.

### NexT theme

This plugin integrated in «NexT» and after plugin enabled in main Hexo config, you may adjust options in NexT config:

```yml
symbols_count_time:
  separated_meta: true
  item_text_post: true
  item_text_total: false
  awl: 4
  wpm: 275
  suffix: mins.
```

#### Parameters

* `awl` – Average Word Length (chars count in word). Default: `4`. You can check this [here](https://charactercounttool.com).
  * CN &asymp; `2`
  * EN &asymp; `5`
  * RU &asymp; `6`
* `wpm` – Words Per Minute. Default: `275`. You can check this [here](https://wordcounter.net).
  * Slow &asymp; `200`
  * Normal &asymp; `275`
  * Fast &asymp; `350`
* `suffix` – If time to read less then 60 minutes, added suffix as string parameter.\
  If not defined, `mins.` will be used as default.
* `exclude_codeblock` – Allow to exclude all content inside code blocks for more accurate words counting.\
  If not defined, `false` will be used as default.

**Note for Chinese users:** because in Chinese language average word length about `~1.5` and if you at most cases write posts in Chinese (without mixed English), recommended to set `awl` to `2` and `wpm` to `300`.\
But if you usualy mix your posts with English, `awl` to `4` and `wpm` to `275` will be nice.

## Development

```bash
$ cd hexo
$ git clone https://github.com/theme-next/hexo-symbols-count-time.git node_modules/hexo-symbols-count-time
$ cd node_modules/hexo-symbols-count-time
```

### Tests

```bash
$ npm install mocha chai --save-dev
$ npm test
```

### Tests with coverage

```bash
$ npm install -g istanbul
$ istanbul cover --print both node_modules/.bin/_mocha -- test/index.js
```

### Templates

#### Symbols Count

```js
{{ symbolsCount(post) }}
```

#### Symbols Time

```js
{{ symbolsTime(post) }}
```

Or with predefined parameters:

```js
{{ symbolsTime(post, awl, wpm, suffix) }}
```

#### Symbols Count Total

```js
{{ symbolsCountTotal(site) }}
```

#### Symbols Time Total

```js
{{ symbolsTimeTotal(site) }}
```

Or with predefined parameters:

```js
{{ symbolsTimeTotal(site, awl, wpm, suffix) }}
```

#### Renderers syntax

SWIG / Nunjucks: `{{` `template` `}}`\
EJS: `<%-` `template` `%>`\
Jade: `span=` `template`
