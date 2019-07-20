<h1 align="center">从 NexT v5.1.x 更新</h1>

在 5.1.x 版本和 6.0.x 版本之间没有很大的革命性改进。主版本号变更至 6 主要是因为：

1. 主仓库已从 [iissnan 名下](https://github.com/iissnan/hexo-theme-next) 迁移至 [theme-next](https://github.com/theme-next) 组织。
2. `next/source/lib` 目录下的绝大多数库被移出到了 [NexT 组织的外部仓库](https://github.com/theme-next)中。
3. 第三方插件 [`hexo-wordcount`](https://github.com/willin/hexo-wordcount) 被 [`hexo-symbols-count-time`](https://github.com/theme-next/hexo-symbols-count-time) 所取代，因为 `hexo-symbols-count-time` 没有任何外部 nodejs 依赖、也没有会导致生成站点时的性能问题 [language filter](https://github.com/willin/hexo-wordcount/issues/7)。

推荐通过如下步骤从 v5 升级到 v6：

1. 并不修改原有的 `next` 目录，而只是复制部分 NexT 文件：
    1. `config.yml` 或 `next.yml`（如果你使用了[数据文件](DATA-FILES.md)）。
    2. 自定义的 CSS 配置，它们应在 `next/source/css/_custom/*` 和 `next/source/css/_variables/*` 中。
    3. 自定义的排布配置，它们应在 `next/layout/_custom/*` 中。
    4. 任何其它可能的附加自定义内容；为了定位它们，你可以通过某些工具在仓库间比较。
2. 克隆新的 v6.x 仓库到任一异于 `next` 的目录（如 `next-reloaded`）：
    ```sh
    $ git clone https://github.com/theme-next/hexo-theme-next themes/next-reloaded
    ```
    如此，你可以在不修改原有的 NexT v5.1.x 目录的同时使用 `next-reloaded` 目录中的新版本主题。
3. 在 Hexo 的主配置文件中设置主题：
    ```yml
    ...
    theme: next-reloaded
    ...
    ```
    如此，你的 `next-reloaded` 主题将在生成站点时被加载。如果你遇到了任何错误、或只是不喜欢这一新版本，你可以随时切换回旧的 v5.1.x 版本。

4. 更新语言配置

    从 v6.0.3版本起，`zh-Hans`改名为`zh-CN`：https://github.com/theme-next/hexo-theme-next/releases/tag/v6.0.3
    
    升级到v6.0.3及以后版本的用户，需要显式修改`_config.xml`里的language配置，否则语言显示不正确。

关于第三方库的启用，参见[这里](https://github.com/theme-next/hexo-theme-next/blob/master/docs/zh-CN/INSTALLATION.md#插件)。
