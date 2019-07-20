<h1 align="center">Update from NexT v5.1.x</h1>

There are no hard breaking changes between 5.1.x and 6.0.x versions. It's change major version to 6 because:

1. Main repo was rebased from [iissnan's](https://github.com/iissnan/hexo-theme-next) profile to [theme-next](https://github.com/theme-next) organization.
2. Most libraries under the `next/source/lib` directory was moved out to [external repos under NexT organization](https://github.com/theme-next).
3. 3rd-party plugin [`hexo-wordcount`](https://github.com/willin/hexo-wordcount) was replaced by [`hexo-symbols-count-time`](https://github.com/theme-next/hexo-symbols-count-time) because `hexo-symbols-count-time` no have any external nodejs dependencies, no have [language filter](https://github.com/willin/hexo-wordcount/issues/7) which causes better performance on speed at site generation.

So, i suggest to update from version 5 to version 6 in this way:

1. You don't touch old `next` dir and just do some copies of NexT files:\
   1.1. `config.yml` or `next.yml` (if you used [data-files](DATA-FILES.md)).\
   1.2. Custom CSS styles what placed in `next/source/css/_custom/*` and `next/source/css/_variables/*` directories.\
   1.3. Custom layout styles what placed in `next/layout/_custom/*`.\
   1.4. Any another possible custom additions which can be finded by compare tools between repos.
2. Clone new v6.x repo to any another directory instead of `next`. For example, in `next-reloaded` directory: `git clone https://github.com/theme-next/hexo-theme-next themes/next-reloaded`. So, you don't touch your old NexT 5.1.x directory and can work with new `next-reloaded` dir.
3. Go to Hexo main config and set theme parameter: `theme: next-reloaded`. So, your `next-reloaded` directory must loading with your generation. If you may see any bugs or you simply not like this version, you anytime can switch for 5.1.x version back.

And how to enable 3rd-party libraries see [here](https://github.com/theme-next/hexo-theme-next/blob/master/docs/INSTALLATION.md#plugins).
