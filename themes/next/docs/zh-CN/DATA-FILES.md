<h1 align="center">数据文件</h1>

目前，通过 pull 或下载新的 release 版本来更新 NexT 主题的体验并不平滑。当用户使用 `git pull` 更新 NexT 主题时经常需要解决冲突问题，而在手动下载 release 版本时也经常需要手动合并配置。

现在来说，NexT 推荐用户存储部分配置在站点的 `_config.yml` 中，而另一部分在主题的 `_config.yml` 中。这一方式固然可用，但也有一些缺点：
1. 配置项被分裂为两部分；
2. 用户难以弄清何处存放配置选项。

为了解决这一问题，NexT 将利用 Hexo 的[数据文件](https://hexo.io/docs/data-files.html)特性。因为数据文件是在 Hexo 3 中被引入，所以你需要更新至 Hexo 3.0 以后的版本来使用这一特性。

如果你仍然希望使用 Hexo 2.x，你依旧可以按老的方式进行配置。NexT 仍然兼容 Hexo 2.x（但可能会出现错误）。

<h2 align="center">选择 1：Hexo 方式</h2>

使用这一方式，你的全部配置都将置于 hexo 主要配置文件中（`hexo/_config.yml`），并且不需要修改 `next/_config.yml`，或者创建什么其他的文件。但是所有的主题选项必须放置在 `theme_config` 后，并全部增加两个空格的缩进。

如果在新的 release 中出现了任何新的选项，那么你只需要从 `next/_config.yml` 中将他们复制到 `hexo/_config.yml` 中并设置它们的值为你想要的选项。

### 用法

1. 请确认不存在 `hexo/source/_data/next.yml` 文件（如果已存在，请删除）
2. 从主题的 `next/_config.yml` 文件中复制你需要的 NexT 配置项到 `hexo/_config.yml` 中，然后\
   2.1. 所有这些配置项右移两个空格（在 Visual Studio Code 中：选中这些文字，<kbd>CTRL</kbd> + <kbd>]</kbd>）。\
   2.2. 在这些参数最上方添加一行 `theme_config:`。

### 相关链接

* [Hexo 配置](https://hexo.io/zh-cn/docs/configuration.html)
* [Hexo Pull #757](https://github.com/hexojs/hexo/pull/757)

<h2 align="center">选择 2: NexT 方式</h2>

使用这一方式，你现在可以将你的全部配置置于同一位置（`source/_data/next.yml`），并且不需要修改 `next/_config.yml`。
但是可能无法让所有 Hexo 外部库都准确处理它们的附加选项（举个例子，`hexo-server` 模块只会从 Hexo 默认配置文件中读取选项）。

如果在新的 release 中出现了任何新的选项，那么你只需要从 `next/_config.yml` 中将他们复制到 `source/_data/next.yml` 中并设置它们的值为你想要的选项。

### 用法

1. 请确认你的 Hexo 版本为 3.0 或更高。
2. 在你站点的 `hexo/source/_data` 目录创建一个 `next.yml` 文件（如果 `_data` 目录不存在，请创建之）。

<p align="center">以上步骤之后有 <b>两种选择</b>，请<b>任选其一</b>然后<b>继续后面的步骤</b>。</p>

* **选择 1：`override: false`（默认）**：

  1. 检查默认 NexT 配置中的 `override` 选项，必须设置为 `false`。\
     在 `next.yml` 文件中，也要设置为 `false`，或者不定义此选项。
  2. 从站点的 `_config.yml` 与主题的 `_config.yml` 中复制你需要的选项到 `hexo/source/_data/next.yml` 中。

* **选择 2：`override: true`**：

  1. 在 `next.yml` 中设置 `override` 选项为 `true`。
  2. 从 `next/_config.yml` 配置文件中复制**所有**的 NexT 主题选项到 `hexo/source/_data/next.yml` 中。

3. 然后，在站点的 `hexo/_config.yml`中需要定义 `theme: next` 选项（如果需要的话，`source_dir: source`）。
4. 使用标准参数来启动服务器，生成或部署（`hexo clean && hexo g -d && hexo s`）。

### 相关链接

* [NexT Issue #328](https://github.com/iissnan/hexo-theme-next/issues/328)
