# hexo-server

[![Build Status](https://travis-ci.org/hexojs/hexo-server.svg?branch=master)](https://travis-ci.org/hexojs/hexo-server)  [![NPM version](https://badge.fury.io/js/hexo-server.svg)](http://badge.fury.io/js/hexo-server) [![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-server.svg)](https://coveralls.io/r/hexojs/hexo-server?branch=master) [![Build status](https://ci.appveyor.com/api/projects/status/ycbw8t7w3kjju0tv/branch/master?svg=true)](https://ci.appveyor.com/project/tommy351/hexo-server/branch/master)

Server module for [Hexo].

## Installation

``` bash
$ npm install hexo-server --save
```

## Usage

``` bash
$ hexo server
```

Option | Description | Default
--- | --- | ---
`-i`, `--ip` | Override the default server IP. | `::` when IPv6 is available, else `0.0.0.0` (note: in most systems, `::` also binds to `0.0.0.0`)
`-p`, `--port` | Override the default port. | 4000
`-s`, `--static` | Only serve static files. | false
`-l`, `--log [format]` | Enable logger. Override log format. | false
`-o`, `--open` | Immediately open the server url in your default web browser. | false

## Options

``` yaml
server:
  port: 4000
  log: false
  ip: 0.0.0.0
  compress: false
  header: true
  serveStatic:
    extensions:
    - html
```

- **port**: Server port
- **log**: Display request info on the console. Always enabled in debug mode.
- **ip**: Server IP
- **compress**: Enable GZIP compression
- **header**: Add `X-Powered-By: Hexo` header
- **serveStatic**: Extra options passed to [serve-static](https://github.com/expressjs/serve-static#options)

## License

MIT

[Hexo]: http://hexo.io/
