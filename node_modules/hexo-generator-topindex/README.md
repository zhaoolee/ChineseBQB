# hexo-generator-topindex

Top and Index generator for [Hexo].

## Installation

``` bash
$ npm install hexo-generator-topindex --save
```

## Options

``` yaml
topindex_generator:
  per_page: 10
  order_by: -date
```

- **per_page**: Posts displayed per page. (0 = disable pagination)
- **order_by**: Posts order. (Order by date descending by default)

## Post set
You can set property ``top`` to finish top, the higher the priority

```
---
title: Hello World
date: 2017-03-12 19:45:02
top: 5
categories: "Hexo Guid" 
tags: [Hexo]
description: Hello world on hexo!
---
Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

```

## License

MIT

[Hexo]: http://hexo.io/