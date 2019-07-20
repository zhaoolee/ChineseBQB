<h1 align="center">安装</h1>

<h2 align="center">步骤 1 &rarr; 进入 Hexo 目录</h2>

进入 **hexo 根**目录。这一目录中应当有 `node_modules`、`source`、`themes` 等若干子目录：
   ```sh
   $ cd hexo
   $ ls
   _config.yml  node_modules  package.json  public  scaffolds  source  themes
   ```

<h2 align="center">步骤 2 &rarr; 获取 NexT</h2>

<p align="center">从 GitHub 下载主题。</br>
为了下载这一主题，共有 <b>3 种选项</b>可选。你需要选择其中<b>唯一一个方式</b>。</p>

### 选项 1：下载[最新 release 版本][releases-latest-url]

   通常情况下请选择 **stable** 版本。推荐不熟悉的用户按此方式进行。

   * 使用 [curl、tar 和 wget][curl-tar-wget-url] 安装：

     ```sh
     $ mkdir themes/next
     $ curl -s https://api.github.com/repos/theme-next/hexo-theme-next/releases/latest | grep tarball_url | cut -d '"' -f 4 | wget -i - -O- | tar -zx -C themes/next --strip-components=1
     ```
     这种方式将**仅提供最新的 release 版本**（其中不附带 `.git` 目录）。\
     因此，将来你将不可能通过 `git` 更新这一方式安装的主题。\
     取而代之的，为了能不丢失你的自定义配置，你可以使用独立的配置文件（例如 [数据文件][docs-data-files-url]）并下载最新版本到旧版本的目录中（或者下载到新的主题目录中并修改 Hexo 配置中的主题名）。

### 选项 2：下载 [tag 指向的 release 版本][releases-url]

   在少数情况下将有所帮助，但这并非推荐方式。\
   你必须指定一个版本：使用 [tags 列表][tags-url]中的任意 tag 替换 `v6.0.0`。

   * 方式 1：使用 [curl 和 tar][curl-tar-url] 安装：

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball/v6.0.0 | tar -zxv -C themes/next --strip-components=1
     ```
     和上述的 `curl、tar 和 wget` 方法相同，但只会下载**指定的 release 版本**。

   * 方式 2：使用 [git][git-url] 安装：

     ```sh
     $ git clone --branch v6.0.0 https://github.com/theme-next/hexo-theme-next themes/next
     ```
     这一方式将为你下载**指定的 release 版本**（其中包含 `.git` 目录）。\
     并且，你可以随时切换到任何已定义的版本号所对应的 tag 的版本。

### 选项 3：下载[最新 master 分支][download-latest-url]

   可能**不稳定**，但包含最新的特性。推荐进阶用户和开发者按此方式进行。

   * 方式 1：使用 [curl 和 tar][curl-tar-url] 安装：

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball | tar -zxv -C themes/next --strip-components=1
     ```
     和上述的 `curl、tar 和 wget` 方法相同，但只会下载**最新 master 分支版本**。\
     在有些情况对开发者有所帮助。

   * 方式 2：使用 [git][git-url] 安装：

     ```sh
     $ git clone https://github.com/theme-next/hexo-theme-next themes/next
     ```

     这一方式将为你下载**完整仓库**（其中包含 `.git` 目录）。\
     你可以随时[使用 git 更新至最新版本][update-with-git-url]并切换至任何有 tag 标记的 release 版本、最新的 master 分支版本、甚至其他分支。\
     在绝大多数情况下对用户和开发者友好。

     获取 tags 列表：

     ```sh
     $ cd themes/next
     $ git tag -l
     …
     v6.0.0
     v6.0.1
     v6.0.2
     ```

     例如，假设你想要切换到 `v6.0.1` 这一 [tag 指向的 release 版本][tags-url]。输入如下指令：

     ```sh
     $ git checkout tags/v6.0.1
     Note: checking out 'tags/v6.0.1'.
     …
     HEAD is now at da9cdd2... Release v6.0.1
     ```

     然后，假设你想要切换回 [master 分支][commits-url]，输入如下指令即可：

     ```sh
     $ git checkout master
     ```

<h2 align="center">步骤 3 &rarr; 完成配置</h2>

在 **hexo 根配置**文件 `_config.yml` 中设置你的主题：

```yml
theme: next
```

[download-latest-url]: https://github.com/theme-next/hexo-theme-next/archive/master.zip
[releases-latest-url]: https://github.com/theme-next/hexo-theme-next/releases/latest
[releases-url]: https://github.com/theme-next/hexo-theme-next/releases
[tags-url]: https://github.com/theme-next/hexo-theme-next/tags
[commits-url]: https://github.com/theme-next/hexo-theme-next/commits/master

[git-url]: http://lmgtfy.com/?q=linux+git+install
[curl-tar-url]: http://lmgtfy.com/?q=linux+curl+tar+install
[curl-tar-wget-url]: http://lmgtfy.com/?q=linux+curl+tar+wget+install

[update-with-git-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/README.md#update
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/DATA-FILES.md
