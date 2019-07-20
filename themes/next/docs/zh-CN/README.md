<div align="right">语言: <a title="英语" href="../../README.md">:us:</a>
:cn:
<a title="俄语" href="../../docs/ru/README.md">:ru:</a></div>

# <div align="center"><a title="NexT website repository" href="https://github.com/theme-next/theme-next.org"><img align="center" width="56" height="56" src="https://raw.githubusercontent.com/theme-next/hexo-theme-next/master/source/images/logo.svg?sanitize=true"></a> e x T</div>

<p align="center">«NexT» 是一款风格优雅的高质量 <a href="http://hexo.io">Hexo</a> 主题，自点点滴滴中用爱雕琢而成。</p>

<p align="center">
  <a href="https://bestpractices.coreinfrastructure.org/projects/2625"><img src="https://bestpractices.coreinfrastructure.org/projects/2625/badge" title="Core Infrastructure Initiative Best Practices"></a>
  <a href="https://www.codacy.com/app/theme-next/hexo-theme-next?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=theme-next/hexo-theme-next&amp;utm_campaign=Badge_Grade"><img src="https://api.codacy.com/project/badge/Grade/72f7fe7609c2438a92069f448e5a341a" title="Project Grade"></a>
  <a href="https://travis-ci.org/theme-next/hexo-theme-next?branch=master"><img src="https://travis-ci.org/theme-next/hexo-theme-next.svg?branch=master" title="Travis CI [Linux]"></a>
  <a href="https://crwd.in/theme-next"><img src="https://d322cqt584bo4o.cloudfront.net/theme-next/localized.svg" title="请花几秒钟来添加或修正翻译！"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/releases"><img src="https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg"></a>
  <a href="http://hexo.io"><img src="https://img.shields.io/badge/hexo-%3E%3D%203.5.0-blue.svg"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-%20AGPL-blue.svg"></a>
</p>

## 即时预览

* :heart_decoration: Muse 主题: [LEAFERx](https://leaferx.online) | [Alex LEE](http://saili.science) | [Miaia](https://11.tt)
* :six_pointed_star: Mist 主题: [uchuhimo](http://uchuhimo.me) | [xirong](http://www.ixirong.com)
* :pisces: Pisces 主题: [Vi](http://notes.iissnan.com) | [Acris](https://acris.me) | [Jiaxi He](http://jiaxi.io)
* :gemini: Gemini 主题: [Ivan.Nginx](https://almostover.ru) | [Raincal](https://raincal.com) | [Dandy](https://dandyxu.me)

更多 «NexT» 的例子参见[这里](https://github.com/iissnan/hexo-theme-next/issues/119)。

## 安装

最简单的安装方式是直接克隆整个仓库：

   ```sh
   $ cd hexo
   $ git clone https://github.com/theme-next/hexo-theme-next themes/next
   ```

此外，如果你想要使用其他方式，你也可以参见[详细安装步骤][docs-installation-url]。

## 插件

在 NexT 配置中你现在可以找到已经被移至外部仓库的依赖项。你可以在[组织主页](https://github.com/theme-next)中找到它们。

例如，假设你想要在你的站点中使用 `fancybox` 插件，请进入 NexT 配置文件，你会看到如下内容：

```yml
# Fancybox
# Dependencies: https://github.com/theme-next/theme-next-fancybox
fancybox: false
```

将 `fancybox` 配置项打开，进入它上面的 «Dependencies» 链接以查看它的安装步骤。

### 例外

如果你使用的插件脚本依赖 CDN，那么需要替换你的 CDN 链接：

例如，假如你使用了 `fancybox` 插件并且配置了 CDN 加载链接，进入 Next 配置文件，你会看到如下内容：

```yml
vendors:
  # ...
  # Some contents...
  # ...
  fancybox: # Set or update fancybox cdn url.
  fancybox_css: # Set or update fancybox cdn url.
```

通过替换 CDN 链接来替换 [插件列表](https://github.com/theme-next) 项目来升级。

## 更新

你可以通过如下命令更新到最新的 master 分支：

```sh
$ cd themes/next
$ git pull
```

如果你在此过程中收到了任何错误报告 (例如 **«Commit your changes or stash them before you can merge»**)，我们推荐你使用 [Hexo 数据文件][docs-data-files-url]特性。\
然而你也可以通过提交（`Commit`）、贮藏（`Stash`）或忽视（`Discard`）本地更改以绕过这种更新错误。具体方法请参考[这里](https://stackoverflow.com/a/15745424/5861495)。

**如果你想要从 v5.1.x 更新到 v6.0.x，阅读[这篇文档][docs-update-5-1-x-url]。**

## 已知问题

对于仍然遇到 **«[Error: Cannot find module 'hexo-util'](https://github.com/iissnan/hexo-theme-next/issues/1490)»** 这一错误的用户，请检查你的 NPM 版本。

* `> 3`：仍然出现错误吗？请删除 `node_modules` 目录并通过 `npm install` 重新安装。
* `< 3`：请通过 `npm install --save-dev hexo-util` 将 `hexo-util` 依赖手动添加至你的站点依赖包中。

## 贡献你的代码

我们欢迎你贡献出你的一份力量，你可以随时提交 issue 或 fork 本仓库。静候你的 pull request。

## 反馈

* 在 [Stack Overflow][stack-url] 上提问。
* 在 [GitHub Issues][issues-bug-url] 报告Bug。
* 在 [GitHub][issues-feat-url] 请求新的功能。
* 为 [popular feature requests][feat-req-vote-url] 投票。
* 加入我们的 [Gitter][gitter-url] / [Riot][riot-url] / [Telegram][t-chat-url] 聊天。
* 关注我们的 [Telegram Channel][t-news-url] 以获取最新消息。

## 第三方应用程序

* :triangular_flag_on_post: <a title="Hexo Markdown 编辑器" href="https://github.com/zhuzhuyule/HexoEditor" target="_blank">HexoEditor</a>

## 鸣谢

<p align="center">
«NexT» 特别感谢这些支持我们核心基础设施的优质服务：
</p>

<p align="center"><a href="https://github.com"><img align="center" width="100" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"></a>
&nbsp;<a href="https://www.netlify.com"><img align="center" width="150" src="https://cdn.netlify.com/15ecf59b59c9d04b88097c6b5d2c7e8a7d1302d0/1b6d6/img/press/logos/full-logo-light.svg"></a></p>
<p align="center">
  <sub>GitHub 容许我们托管 Git 仓库，Netlify 容许我们分发文档。</sub>
</p>

<p align="center"><a href="https://crowdin.com"><img align="center" width="180" src="https://support.crowdin.com/assets/logos/crowdin-logo1-small.png"></a></p>
<p align="center">
  <sub>Crowdin 容许我们方便地翻译文档。</sub>
</p>

<p align="center"><a href="https://codacy.com"><img align="center" width="155" src="https://user-images.githubusercontent.com/16944225/55026017-623f8f00-5002-11e9-88bf-0d6a5884c6c2.png"></a>
&nbsp;<a href="https://www.browserstack.com"><img align="center" width="140" src="https://www.browserstack.com/images/mail/browserstack-logo-footer.png"></a></p>
<p align="center">
  <sub>Codacy 容许我们运行测试套件，BrowserStack 容许我们在真实的浏览器中进行测试。</sub>
</p>

[browser-image]: https://img.shields.io/badge/browser-%20chrome%20%7C%20firefox%20%7C%20opera%20%7C%20safari%20%7C%20ie%20%3E%3D%209-lightgrey.svg
[browser-url]: https://www.browserstack.com

[stack-url]: https://stackoverflow.com/questions/tagged/theme-next
[issues-bug-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Bug&template=bug-report.md
[issues-feat-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Feature+Request&template=feature-request.md
[feat-req-vote-url]: https://github.com/theme-next/hexo-theme-next/issues?q=is%3Aopen+is%3Aissue+label%3A%22Feature+Request%22+sort%3Areactions-%2B1-desc

[gitter-url]: https://gitter.im/theme-next
[riot-url]: https://riot.im/app/#/room/#theme-next:matrix.org
[t-chat-url]: https://t.me/theme_next_chinese
[t-news-url]: https://t.me/theme_next_news

<!--[rel-image]: https://img.shields.io/github/release/theme-next/hexo-theme-next.svg-->
<!--[rel-image]: https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg-->
<!--[mnt-image]: https://img.shields.io/maintenance/yes/2018.svg-->

[download-latest-url]: https://github.com/theme-next/hexo-theme-next/archive/master.zip
[releases-latest-url]: https://github.com/theme-next/hexo-theme-next/releases/latest
<!--[releases-url]: https://github.com/theme-next/hexo-theme-next/releases-->
[tags-url]: https://github.com/theme-next/hexo-theme-next/tags
[commits-url]: https://github.com/theme-next/hexo-theme-next/commits/master

[docs-installation-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/INSTALLATION.md
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/DATA-FILES.md
[docs-update-5-1-x-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/UPDATE-FROM-5.1.X.md
