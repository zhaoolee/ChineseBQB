<div align="right">Language: :us:
<a title="Chinese" href="docs/zh-CN/README.md">:cn:</a>
<a title="Russian" href="docs/ru/README.md">:ru:</a></div>

# <div align="center"><a title="NexT website repository" href="https://github.com/theme-next/theme-next.org"><img align="center" width="56" height="56" src="https://raw.githubusercontent.com/theme-next/hexo-theme-next/master/source/images/logo.svg?sanitize=true"></a> e x T</div>

<p align="center">«NexT» is a high quality elegant <a href="http://hexo.io">Hexo</a> theme. It is crafted from scratch with love.</p>

<p align="center">
  <a href="https://bestpractices.coreinfrastructure.org/projects/2625"><img src="https://bestpractices.coreinfrastructure.org/projects/2625/badge" title="Core Infrastructure Initiative Best Practices"></a>
  <a href="https://www.codacy.com/app/theme-next/hexo-theme-next?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=theme-next/hexo-theme-next&amp;utm_campaign=Badge_Grade"><img src="https://api.codacy.com/project/badge/Grade/72f7fe7609c2438a92069f448e5a341a" title="Project Grade"></a>
  <a href="https://travis-ci.org/theme-next/hexo-theme-next?branch=master"><img src="https://travis-ci.org/theme-next/hexo-theme-next.svg?branch=master" title="Travis CI [Linux]"></a>
  <a href="https://i18n.theme-next.org"><img src="https://d322cqt584bo4o.cloudfront.net/theme-next/localized.svg" title="Add or improve translation in few seconds!"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/releases"><img src="https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg"></a>
  <a href="http://hexo.io"><img src="https://img.shields.io/badge/hexo-%3E%3D%203.5.0-blue.svg"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-%20AGPL-blue.svg"></a>
</p>

## Live Preview

* :heart_decoration: Muse scheme: [LEAFERx](https://leaferx.online) | [Alex LEE](http://saili.science) | [Miaia](https://11.tt)
* :six_pointed_star: Mist scheme: [uchuhimo](http://uchuhimo.me) | [xirong](http://www.ixirong.com)
* :pisces: Pisces scheme: [Vi](http://notes.iissnan.com) | [Acris](https://acris.me) | [Jiaxi He](http://jiaxi.io)
* :gemini: Gemini scheme: [Ivan.Nginx](https://almostover.ru) | [Raincal](https://raincal.com) | [Dandy](https://dandyxu.me)

More «NexT» examples [here](https://github.com/iissnan/hexo-theme-next/issues/119).

## Installation

Simplest way to install is by cloning the entire repository:

   ```sh
   $ cd hexo
   $ git clone https://github.com/theme-next/hexo-theme-next themes/next
   ```

Or you can see [detailed installation instructions][docs-installation-url] if you want any other variant.

## Plugins

In NexT config now you can find dependencies on each module which was moved to external repositories which can be found by [main organization link](https://github.com/theme-next).

For example, if you want to use `fancybox` in your site, go to NexT config and see:

```yml
# Fancybox
# Dependencies: https://github.com/theme-next/theme-next-fancybox
fancybox: false
```

Then turn on `fancybox` and go to «Dependencies» link with installation instructions of this module.

### Exceptions

If you use cdn for any plugins, you need to replace your cdn link.

For example, if you want to use `fancybox` and you configured a cdn link, go to NexT config and see:

```yml
vendors:
  # ...
  # Some contents...
  # ...
  fancybox: # Set or update fancybox cdn url.
  fancybox_css: # Set or update fancybox cdn url.
```

Instead of defining [main organization link](https://github.com/theme-next) for updates.

## Update

You can update to latest master branch by the following command:

```sh
$ cd themes/next
$ git pull
```

And if you see any error message during update (something like **«Commit your changes or stash them before you can merge»**), recommended to learn [Hexo data files][docs-data-files-url] feature.\
However, you can bypass update errors by using the `Commit`, `Stash` or `Reset` commands for local changes. See [here](https://stackoverflow.com/a/15745424/5861495) how to do it.

**If you want to update from v5.1.x to v6.0.x, read [here][docs-update-5-1-x-url].**

## Known Bugs

For those who also encounter **«[Error: Cannot find module 'hexo-util'](https://github.com/iissnan/hexo-theme-next/issues/1490)»**, please check your NPM version.

* `> 3`: Still not work? Please remove `node_modules` directory and reinstall using `npm install`.
* `< 3`: Please add `hexo-util` explicitly via `npm install --save-dev hexo-util` to you site package deps.

## Contributing

Contribution is welcome, feel free to open an issue and fork. Waiting for your pull request.

## Feedback

* Ask a question on [Stack Overflow][stack-url].
* Report a bug in [GitHub Issues][issues-bug-url].
* Request a new feature on [GitHub][issues-feat-url].
* Vote for [popular feature requests][feat-req-vote-url].
* Join to our [Gitter][gitter-url] / [Riot][riot-url] / [Telegram][t-chat-url] chats.
* Follow us with [Telegram Channel][t-news-url] for latest news.

## Third party applications

* :triangular_flag_on_post: <a title="Hexo Markdown Editor" href="https://github.com/zhuzhuyule/HexoEditor" target="_blank">HexoEditor</a>

## Thanks

<p align="center">
«NexT» send special thanks to these great services that sponsor our core infrastructure:
</p>

<p align="center"><a href="https://github.com"><img align="center" width="100" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"></a>
&nbsp;<a href="https://www.netlify.com"><img align="center" width="150" src="https://cdn.netlify.com/15ecf59b59c9d04b88097c6b5d2c7e8a7d1302d0/1b6d6/img/press/logos/full-logo-light.svg"></a></p>
<p align="center">
  <sub>GitHub allows us to host the Git repository, Netlify allows us to distribute the documentation.</sub>
</p>

<p align="center"><a href="https://crowdin.com"><img align="center" width="180" src="https://support.crowdin.com/assets/logos/crowdin-logo1-small.png"></a></p>
<p align="center">
  <sub>Crowdin allows us to translate conveniently the documentation.</sub>
</p>

<p align="center"><a href="https://codacy.com"><img align="center" width="155" src="https://user-images.githubusercontent.com/16944225/55026017-623f8f00-5002-11e9-88bf-0d6a5884c6c2.png"></a>
&nbsp;<a href="https://www.browserstack.com"><img align="center" width="140" src="https://www.browserstack.com/images/mail/browserstack-logo-footer.png"></a></p>
<p align="center">
  <sub>Codacy allows us to run the test suite, BrowserStack allows us to test in real browsers.</sub>
</p>

[browser-image]: https://img.shields.io/badge/browser-%20chrome%20%7C%20firefox%20%7C%20opera%20%7C%20safari%20%7C%20ie%20%3E%3D%209-lightgrey.svg
[browser-url]: https://www.browserstack.com

[stack-url]: https://stackoverflow.com/questions/tagged/theme-next
[issues-bug-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Bug&template=bug-report.md
[issues-feat-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Feature+Request&template=feature-request.md
[feat-req-vote-url]: https://github.com/theme-next/hexo-theme-next/issues?q=is%3Aopen+is%3Aissue+label%3A%22Feature+Request%22+sort%3Areactions-%2B1-desc

[gitter-url]: https://gitter.im/theme-next
[riot-url]: https://riot.im/app/#/room/#theme-next:matrix.org
[t-chat-url]: https://t.me/theme_next
[t-news-url]: https://t.me/theme_next_news

<!--[rel-image]: https://img.shields.io/github/release/theme-next/hexo-theme-next.svg-->
<!--[rel-image]: https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg-->
<!--[mnt-image]: https://img.shields.io/maintenance/yes/2018.svg-->

[download-latest-url]: https://github.com/theme-next/hexo-theme-next/archive/master.zip
[releases-latest-url]: https://github.com/theme-next/hexo-theme-next/releases/latest
<!--[releases-url]: https://github.com/theme-next/hexo-theme-next/releases-->
[tags-url]: https://github.com/theme-next/hexo-theme-next/tags
[commits-url]: https://github.com/theme-next/hexo-theme-next/commits/master

[docs-installation-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/INSTALLATION.md
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/DATA-FILES.md
[docs-update-5-1-x-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/UPDATE-FROM-5.1.X.md

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->

<table><tr><td align="center"><a href="https://almostover.ru"><img src="https://avatars2.githubusercontent.com/u/16944225?v=4" width="100px;" alt="Ivan.Nginx"/><br /><sub><b>Ivan.Nginx</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Aivan-nginx" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ivan-nginx" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ivan-nginx" title="Documentation">📖</a> <a href="#ideas-ivan-nginx" title="Ideas, Planning, & Feedback">🤔</a> <a href="#blog-ivan-nginx" title="Blogposts">📝</a> <a href="#review-ivan-nginx" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ivan-nginx" title="Tests">⚠️</a> <a href="#translation-ivan-nginx" title="Translation">🌍</a> <a href="#design-ivan-nginx" title="Design">🎨</a> <a href="#infra-ivan-nginx" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-ivan-nginx" title="Maintenance">🚧</a></td><td align="center"><a href="http://saili.science"><img src="https://avatars3.githubusercontent.com/u/8521181?v=4" width="100px;" alt="Alex LEE"/><br /><sub><b>Alex LEE</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Asli1989" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=sli1989" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=sli1989" title="Documentation">📖</a> <a href="#review-sli1989" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=sli1989" title="Tests">⚠️</a> <a href="#translation-sli1989" title="Translation">🌍</a></td><td align="center"><a href="https://tsanie.us"><img src="https://avatars1.githubusercontent.com/u/980449?v=4" width="100px;" alt="Tsanie Lily"/><br /><sub><b>Tsanie Lily</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Atsanie" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=tsanie" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=tsanie" title="Documentation">📖</a> <a href="#review-tsanie" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=tsanie" title="Tests">⚠️</a> <a href="#translation-tsanie" title="Translation">🌍</a></td><td align="center"><a href="https://wafer.li"><img src="https://avatars1.githubusercontent.com/u/12459199?v=4" width="100px;" alt="Wafer Li"/><br /><sub><b>Wafer Li</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Awafer-li" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=wafer-li" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=wafer-li" title="Documentation">📖</a> <a href="#review-wafer-li" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=wafer-li" title="Tests">⚠️</a> <a href="#translation-wafer-li" title="Translation">🌍</a></td><td align="center"><a href="https://leaferx.online"><img src="https://avatars2.githubusercontent.com/u/20595509?v=4" width="100px;" alt="Lawrence Ye"/><br /><sub><b>Lawrence Ye</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3ALEAFERx" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=LEAFERx" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=LEAFERx" title="Documentation">📖</a> <a href="#review-LEAFERx" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=LEAFERx" title="Tests">⚠️</a> <a href="#translation-LEAFERx" title="Translation">🌍</a></td><td align="center"><a href="https://blog.maple3142.net/"><img src="https://avatars1.githubusercontent.com/u/9370547?v=4" width="100px;" alt="maple"/><br /><sub><b>maple</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Amaple3142" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=maple3142" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=maple3142" title="Documentation">📖</a> <a href="#review-maple3142" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=maple3142" title="Tests">⚠️</a> <a href="#translation-maple3142" title="Translation">🌍</a></td><td align="center"><a href="https://raincal.com"><img src="https://avatars1.githubusercontent.com/u/6279478?v=4" width="100px;" alt="Raincal"/><br /><sub><b>Raincal</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3ARaincal" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=Raincal" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=Raincal" title="Documentation">📖</a> <a href="#review-Raincal" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=Raincal" title="Tests">⚠️</a></td></tr><tr><td align="center"><a href="https://rainylog.com"><img src="https://avatars1.githubusercontent.com/u/7333266?v=4" width="100px;" alt="Rainy"/><br /><sub><b>Rainy</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ageekrainy" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=geekrainy" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=geekrainy" title="Documentation">📖</a> <a href="#review-geekrainy" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=geekrainy" title="Tests">⚠️</a> <a href="#translation-geekrainy" title="Translation">🌍</a></td><td align="center"><a href="https://liolok.github.io/"><img src="https://avatars0.githubusercontent.com/u/34574198?v=4" width="100px;" alt="李皓奇"/><br /><sub><b>李皓奇</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Aliolok" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=liolok" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=liolok" title="Documentation">📖</a> <a href="#review-liolok" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=liolok" title="Tests">⚠️</a></td><td align="center"><a href="http://ioliu.cn"><img src="https://avatars2.githubusercontent.com/u/10877162?v=4" width="100px;" alt="Nine"/><br /><sub><b>Nine</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AxCss" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=xCss" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=xCss" title="Documentation">📖</a> <a href="#review-xCss" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=xCss" title="Tests">⚠️</a></td><td align="center"><a href="https://github.com/jackey8616"><img src="https://avatars0.githubusercontent.com/u/12930377?v=4" width="100px;" alt="Clooooode"/><br /><sub><b>Clooooode</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ajackey8616" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=jackey8616" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=jackey8616" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/xu-song"><img src="https://avatars3.githubusercontent.com/u/13825126?v=4" width="100px;" alt="Xu Song"/><br /><sub><b>Xu Song</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Axu-song" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=xu-song" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=xu-song" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/HuntedCodes"><img src="https://avatars3.githubusercontent.com/u/10931391?v=4" width="100px;" alt="Jack Sullivan"/><br /><sub><b>Jack Sullivan</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AHuntedCodes" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=HuntedCodes" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=HuntedCodes" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/dpyzo0o"><img src="https://avatars1.githubusercontent.com/u/24768249?v=4" width="100px;" alt="dpyzo0o"/><br /><sub><b>dpyzo0o</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Adpyzo0o" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=dpyzo0o" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=dpyzo0o" title="Documentation">📖</a></td></tr><tr><td align="center"><a href="http://zhuzhuyule.com"><img src="https://avatars1.githubusercontent.com/u/11242146?v=4" width="100px;" alt="zhuzhuxia"/><br /><sub><b>zhuzhuxia</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Azhuzhuyule" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=zhuzhuyule" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=zhuzhuyule" title="Documentation">📖</a></td><td align="center"><a href="https://kuleyu-hugo.netlify.com/"><img src="https://avatars0.githubusercontent.com/u/25771340?v=4" width="100px;" alt="kuleyu"/><br /><sub><b>kuleyu</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Akuleyu" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=kuleyu" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=kuleyu" title="Documentation">📖</a></td><td align="center"><a href="http://jdhao.github.io"><img src="https://avatars2.githubusercontent.com/u/16662357?v=4" width="100px;" alt="jdhao"/><br /><sub><b>jdhao</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ajdhao" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=jdhao" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=jdhao" title="Documentation">📖</a></td><td align="center"><a href="http://www.albertgao.xyz"><img src="https://avatars1.githubusercontent.com/u/18282328?v=4" width="100px;" alt="AlbertGao"/><br /><sub><b>AlbertGao</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AAlbert-Gao" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=Albert-Gao" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=Albert-Gao" title="Documentation">📖</a></td><td align="center"><a href="https://yoshinorin.net/"><img src="https://avatars0.githubusercontent.com/u/11273093?v=4" width="100px;" alt="YoshinoriN"/><br /><sub><b>YoshinoriN</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AYoshinoriN" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=YoshinoriN" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=YoshinoriN" title="Documentation">📖</a></td><td align="center"><a href="https://zhaoqi99.github.io/"><img src="https://avatars3.githubusercontent.com/u/25344334?v=4" width="100px;" alt="Qi Zhao"/><br /><sub><b>Qi Zhao</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AZhaoQi99" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ZhaoQi99" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ZhaoQi99" title="Documentation">📖</a></td><td align="center"><a href="https://changchen.me/"><img src="https://avatars2.githubusercontent.com/u/6239652?v=4" width="100px;" alt="Henry Zhu"/><br /><sub><b>Henry Zhu</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Adaya0576" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=daya0576" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=daya0576" title="Documentation">📖</a></td></tr><tr><td align="center"><a href="https://github.com/cxyfreedom"><img src="https://avatars1.githubusercontent.com/u/8132652?v=4" width="100px;" alt="CxyFreedom"/><br /><sub><b>CxyFreedom</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Acxyfreedom" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=cxyfreedom" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=cxyfreedom" title="Documentation">📖</a></td><td align="center"><a href="https://kaitohh.com/"><img src="https://avatars1.githubusercontent.com/u/13927774?v=4" width="100px;" alt="KaitoHH"/><br /><sub><b>KaitoHH</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AKaitoHH" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=KaitoHH" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=KaitoHH" title="Documentation">📖</a></td><td align="center"><a href="http://www.zhaojun.im"><img src="https://avatars2.githubusercontent.com/u/35387985?v=4" width="100px;" alt="赵俊"/><br /><sub><b>赵俊</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Azhaojun1998" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=zhaojun1998" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=zhaojun1998" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/izyhang"><img src="https://avatars2.githubusercontent.com/u/13059924?v=4" width="100px;" alt="zyhang"/><br /><sub><b>zyhang</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Aizyhang" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=izyhang" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=izyhang" title="Documentation">📖</a></td><td align="center"><a href="https://xiaolony.github.io"><img src="https://avatars2.githubusercontent.com/u/18529307?v=4" width="100px;" alt="Xiaolong Yang"/><br /><sub><b>Xiaolong Yang</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AXiaolonY" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=XiaolonY" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=XiaolonY" title="Documentation">📖</a></td><td align="center"><a href="https://github.com/yzca"><img src="https://avatars1.githubusercontent.com/u/15226118?v=4" width="100px;" alt="花蛄"/><br /><sub><b>花蛄</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ayzca" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=yzca" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=yzca" title="Documentation">📖</a></td><td align="center"><a href="http://hengyunabc.github.io/"><img src="https://avatars2.githubusercontent.com/u/1683936?v=4" width="100px;" alt="hengyunabc"/><br /><sub><b>hengyunabc</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ahengyunabc" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=hengyunabc" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=hengyunabc" title="Documentation">📖</a></td></tr><tr><td align="center"><a href="http://bluefisher.github.io"><img src="https://avatars2.githubusercontent.com/u/6104460?v=4" width="100px;" alt="Fisher Chang"/><br /><sub><b>Fisher Chang</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3ABlueFisher" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=BlueFisher" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=BlueFisher" title="Documentation">📖</a></td><td align="center"><a href="http://chansonshen.com/"><img src="https://avatars2.githubusercontent.com/u/4521477?v=4" width="100px;" alt="Chanson Shen"/><br /><sub><b>Chanson Shen</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Ashenchsh" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=shenchsh" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=shenchsh" title="Documentation">📖</a></td><td align="center"><a href="http://ywjno.com"><img src="https://avatars2.githubusercontent.com/u/842383?v=4" width="100px;" alt="Thomas Yang"/><br /><sub><b>Thomas Yang</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Aywjno" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ywjno" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=ywjno" title="Documentation">📖</a></td><td align="center"><a href="http://legendarynacar.github.io"><img src="https://avatars3.githubusercontent.com/u/8149261?v=4" width="100px;" alt="Legendary Nacar"/><br /><sub><b>Legendary Nacar</b></sub></a><br /><a href="#translation-legendarynacar" title="Translation">🌍</a></td><td align="center"><a href="https://github.com/Rikusen0335"><img src="https://avatars0.githubusercontent.com/u/19174234?v=4" width="100px;" alt="rikusen0335"/><br /><sub><b>rikusen0335</b></sub></a><br /><a href="#translation-Rikusen0335" title="Translation">🌍</a></td><td align="center"><a href="https://www.dnocm.com"><img src="https://avatars3.githubusercontent.com/u/15902347?v=4" width="100px;" alt="Mr.J"/><br /><sub><b>Mr.J</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3AJiangTJ" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=JiangTJ" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=JiangTJ" title="Documentation">📖</a> <a href="#infra-JiangTJ" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td><td align="center"><a href="https://1v9.im"><img src="https://avatars3.githubusercontent.com/u/29083921?v=4" width="100px;" alt="1v9"/><br /><sub><b>1v9</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3A1v9" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=1v9" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=1v9" title="Documentation">📖</a> <a href="#translation-1v9" title="Translation">🌍</a> <a href="#review-1v9" title="Reviewed Pull Requests">👀</a></td></tr><tr><td align="center"><a href="https://zhangshuqiao.org"><img src="https://avatars1.githubusercontent.com/u/16272760?v=4" width="100px;" alt="Mimi"/><br /><sub><b>Mimi</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Astevenjoezhang" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=stevenjoezhang" title="Code">💻</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=stevenjoezhang" title="Documentation">📖</a> <a href="#review-stevenjoezhang" title="Reviewed Pull Requests">👀</a> <a href="#translation-stevenjoezhang" title="Translation">🌍</a></td><td align="center"><a href="https://i-m.dev"><img src="https://avatars2.githubusercontent.com/u/17429111?v=4" width="100px;" alt="张强"/><br /><sub><b>张强</b></sub></a><br /><a href="https://github.com/theme-next/hexo-theme-next/issues?q=author%3Azq-97" title="Bug reports">🐛</a> <a href="https://github.com/theme-next/hexo-theme-next/commits?author=zq-97" title="Code">💻</a></td></tr></table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
