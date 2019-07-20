<div align="right">语言：<a title="英语" href="../../.github/CONTRIBUTING.md">:us:</a>
:cn:
<a title="俄语" href="../ru/CONTRIBUTING.md">:ru:</a></div>

# <div align="center"><a title="Go to homepage" href="https://theme-next.org"><img align="center" width="56" height="56" src="https://raw.githubusercontent.com/theme-next/hexo-theme-next/master/source/images/logo.svg?sanitize=true"></a> e x T</div>

首先，非常感谢大家抽出宝贵时间来让我们的 NexT 主题越变越好。在这里，我们介绍一下 [NexT 主题及其子模块](https://github.com/theme-next) 的开源贡献指南。不过，我们希望大家不要局限于此，更欢迎大家随时进行补充。

## 目录

[如何为 NexT 做贡献](#how-can-i-contribute)

  * [你需要了解的](#before-submitting-an-issue)
  * [反馈 Bug](#reporting-bugs)
    * [提交漏洞](#reporting-security-bugs)
  * [提交功能需求](#suggesting-enhancements)
  * [提交合并请求](#submitting-a-pull-request)
  * [发布版本](#creating-releases)

[规范](#guides)

  * [行为规范](#coding-rules)
  * [编码规范](#coding-standards)
  * [标签规范](#labels-rules)
  * [提交信息规范](#commit-messages-rules)

<a name="how-can-i-contribute"></a>

## 如何为 NexT 做贡献

目前 NexT 主题已经从 [iissnan](https://github.com/iissnan/hexo-theme-next) 的个人仓库移动到了 [Theme-Next](https://github.com/theme-next) 组织仓库中，并升级到 V6 版本。在 V6+ 版本中，`next/source/lib` 目录下的第三方依赖库将独立放置在 [Theme-Next](https://github.com/theme-next) 组织仓库中。在大多数情况下，NexT V5 版本仍然能够正常运行，但是如果你想获得更多的功能和帮助，还是建议您 [升级到 NexT V6+ 版本](https://github.com/theme-next/hexo-theme-next/blob/master/docs/UPDATE-FROM-5.1.X.md)，并移步 [Theme-Next](https://github.com/theme-next/hexo-theme-next) 仓库。

<a name="before-submitting-an-issue"></a>

### 你需要了解的

如果你在使用过程中遇到了问题，你可以查阅 FAQs（建设中） 或者 [NexT 帮助文档](https://theme-next.org/docs/)（建设中）。另外，你也可以通过 [这里](https://github.com/theme-next/hexo-theme-next/search?q=&type=Issues&utf8=%E2%9C%93) 进行大致检索，有些问题已经得到解答，你可以自行解决。对于没有解决的 Issue，你也可以继续提问。

如果你在使用过程中发现了 Bug，请再次确认 Bug 在 [最新发布版本](https://github.com/theme-next/hexo-theme-next/releases/latest) 中是否重现。如果 Bug 重现，欢迎你到我们的 [主题仓库](https://github.com/theme-next/hexo-theme-next) 中 [反馈 Bug ](#reporting-bugs) 或者 [提交功能需求](#suggesting-enhancements)，也更期待您 [提交合并请求](#submitting-a-pull-request)。

<a name="reporting-bugs"></a>

### 反馈 Bug

反馈 Bug 前，请再次确认您已经查看了 [你需要了解的](#before-submitting-an-issue) 内容，避免提交重复的 Issue。确定相关仓库后，创建 Issue 并按照 [模板](../../.github/ISSUE_TEMPLATE.md) 尽可能的详细填写相关信息。

请认真遵守如下指南，这样我们才能更好地理解问题，重现问题和解决问题。

* 在标题中清晰准确地描述你的问题。
* 参照如下问题尽可能多的提供信息：
    * Bug 是否能够重现？是一直出现还是偶尔出现？
    * Bug 是从什么时候开始发生的？
    * 如果 Bug 突然发生，使用 [旧版本主题](https://github.com/theme-next/hexo-theme-next/releases) 是否能够重现 Bug？又是从哪个版本开始出现 Bug？
    * 你所使用 Node，Hexo 以及 Next 的版本号多少？你可以运行 `node -v` 和 `hexo version` 获取版本号，或者查看文件 `package.json` 的内容。
    * 你使用了哪些插件包？查看文件 `package.json` 的内容即可获取。
* 一步步详细你是如何重现 Bug 的，做了什么，使用了哪些功能等等。如果你需要展示代码段，请使用 [Markdown 代码块](https://help.github.com/articles/creating-and-highlighting-code-blocks/) 或 [Github 预览链接](https://help.github.com/articles/creating-a-permanent-link-to-a-code-snippet/) 或 [Gist 链接](https://gist.github.com/)。
* 提供 Bug 的样例，如图像文件、在线演示网址等等。
* 详细描述通过上述重现过程出现的问题。
* 详细描述你期待的结果。

<a name="reporting-security-bugs"></a>

#### 提交漏洞

如果你发现安全问题，请以负责任的方式行事，即不要在公共 Issue 中提交而是直接向我们反馈，这样我们就可以在漏洞被利用之前对其进行修复。请将相关信息发送到 security@theme-next.com（可接受 PGP 加密邮件）。

我们很乐意对任何提交漏洞的人予以特别感谢以便我们修复它。如果你想保持匿名性或使用笔名替代，请告诉我们。我们将充分尊重你的意愿。

<a name="suggesting-enhancements"></a>

### 提交功能需求

提交功能需求前，请再次确认您已经查看了 [你需要了解的](#before-submitting-an-issue) 内容，避免提交重复的 Issue。确定相关仓库后，创建 Issue 并按照 [模板](../../.github/ISSUE_TEMPLATE.md) 尽可能的详细填写相关信息。

请认真遵守如下指南，这样我们才能更好地理解和开发功能需求:pencil:：

* 在标题中清晰准确地描述你的功能需求。
* 详细描述目前所具有的功能和你所期待的功能，并解释为什么需要该功能。
* 提供功能需求的样例，如图像文件、在线演示网址等等。

<a name="submitting-a-pull-request"></a>

### 提交合并请求

提交合并请求前，请再次确认您已经查看了 [你需要了解的](#before-submitting-an-issue) 内容，避免提交重复的合并请求。确定相关仓库后，创建合并请求。更多详细操作过程可以查看 [帮助文档](https://help.github.com/articles/creating-a-pull-request/)。

1. 进入 [hexo-theme-next](https://github.com/theme-next/hexo-theme-next) 主页面，点击`Fork`。
2. 进入到已经`Fork`的个人仓库（`https://github.com/username/hexo-theme-next`），点击 **Clone or download** 并复制该仓库地址。选择本地文件夹，并打开 Git Bash ，输入如下命令并回车，即可完成仓库克隆。
    ```bash
    $ git clone git@github.com:username/hexo-theme-next.git
    ```
3. 进入 `hexo-theme-next` 本地文件夹，并创建分支。
    ```bash
    $ cd hexo-theme-next
    $ git checkout -b patchname
    ```
4. 本地修改并测试，推送分支。
    ```bash
    $ git add .
    $ git commit -m "add commit messamge"
    $ git push origin patchname
    ```
5. 进入 `fork` 后的仓库，切换到新提交的 `patchname` 分支，点击 `patchname` 分支右侧的 **New pull request** 。在 PR 对比页面，正确选择你需要发起合并请求的分支，然后点击 **Create pull request** ，建立一个新的合并申请并描述变动。

请认真遵守如下指南，这样我们才能更好地理解你的合并请求：

* 创建合并请求时，请遵守 [编码规范](#coding-rules) 和 [提交信息规范](#commit-messages-rules)。
* 在标题中清晰准确地描述你的合并请求，不要加入 Issue 编号。
* 按照 [模板](../../.github/PULL_REQUEST_TEMPLATE.md) 尽可能的详细填写相关信息。
* 合并请求需要在所有主题样式中测试通过，并提供所表现功能的样例，如图像文件、在线演示网址等等。

<a name="creating-releases"></a>

### 发布版本

版本发布是将项目发布给用户的一种很好的方式。

1. 进入 GitHub 项目主页，点击 **Releases** 和 **Draft a new release**。
2. 输入你需要发布的版本号。版本控制是基于 [Git tags](https://git-scm.com/book/en/Git-Basics-Tagging) 工作的，建议按照 [About Major and Minor NexT versions](https://github.com/theme-next/hexo-theme-next/issues/187) 确定版本号。
3. 确定你需要发布的分支。除非发布测试版本，通常情况下选择 `master` 分支。
4. 输入发布版本的标题和说明。
    - 标题为版本号。
    - 所有内容更改的类型包括了 **Breaking Changes**, **Updates**, **Features** 和 **Bug Fixes**。在描述 Breaking Changes 时，使用二级标题分别陈述，描述其他类型时，使用项目列表陈述。
    - 使用被动语态，省略主语。
    - 所有的变化都需要记录在版本说明中。对于没有使用 PR 的更改，需要添加相应的 commit 编号。如果使用了 PR 进行合并修改，则直接添加相应的 PR 编号即可。
5. 如果您希望随版本一起发布二进制文件（如编译的程序），请在上传二进制文件对话框中手动拖放或选择文件。
6. 如果版本不稳定，请选择 **This is a pre-release**，以通知用户它尚未完全准备好。如果您准备公布您的版本，请点击 **Publish release**。否则，请单击 **Save draft** 以稍后处理。

<a name="guides"></a>

## 规范

<a name="coding-rules"></a>

### 行为规范

为了保证本项目的顺利运作，所有参与人都需要遵守 [行为规范](CODE_OF_CONDUCT.md)。

<a name="coding-standards"></a>

### 编码规范

未完待续。

<a name="labels-rules"></a>

### 标签规范

为了方便维护人员和用户能够快速找到他们想要查看的问题，我们使用“标签”功能对 Pull requests 和 Issues 进行分类。

如果您不确定某个标签的含义，或者不知道将哪些标签应用于 PR 或 issue，千万别错过这个。

Issues 的标签：使用`类型`+`内容`+`结果`的组合

- 类型
    - `Irrelevant`: 与 NexT 主题无关的 Issue
    - `Duplicate`: 重复提及的 Issue
    - `Bug`: 检测到需要进行确认的 Bug
    - `Improvement Need`: 需要改进的 Issue
    - `Feature Request`: 提出了新功能请求的 Issue
    - `High Priority`: 检测到具有高优先级的 Bug 或笔误的 Issue
    - `Low Priority`: 检测到具有低优先级的 Bug 或笔误的 Issue
    - `Non English`: 需要多语言维护者参与的 Issue
    - `Discussion`: 需要进行讨论的 Issue
    - `Question`: 提出疑问的 Issue
    - `Backlog`: 待解决的 Issue
    - `Meta`: 表明使用条款变更的 Issue
- 内容
    - `Roadmap`: 与 NexT 主题发展相关的 Issue
    - `Hexo`: 与 Hexo 相关的 Issue
    - `Scheme [1] - Mist`: 与 Mist 主题相关的 Issue
    - `Scheme [2] - Muse`: 与 Muse 主题相关的 Issue
    - `Scheme [3] - Pisces`: 与 Pisces 主题相关的 Issue
    - `Scheme [4] - Gemini`: 与 Gemini 主题相关的 Issue
    - `3rd Party Service`: 与第三方服务相关的 Issue
    - `Docs`: 需要添加文档说明的 Issue
    - `Configurations`: 与 NexT 主题设置相关的 Issue
    - `CSS`: 与 NexT 主题 CSS 文件相关的 Issue
    - `Custom`: 与 NexT 主题个性化相关的 Issue
- 结果
    - `Wontfix`: 不能或不被修复的 Issue
    - `Need More Info`: 需要更多信息的 Issue
    - `Need Verify`: 需要开发人员或用户确认 Bug 或解决方法的 Issue
    - `Can't Reproduce`: 无法复现的 Issue
    - `Verified`: 已经被确认的 Issue
    - `Help Wanted`: 需要帮助的 Issue
    - `Wait for Answer`: 需要开发人员或用户回复的 Issue
    - `Resolved Maybe`: 可能已经解决的 Issue
    - `Solved`: 已经解决的 Issue
    - `Stale`: 由于长期无人回应被封存的 Issue

Pull requests 的标签：

- `Breaking Change`: 产生重大变动的 Pull request
- `External Change`: 针对外部变动进行更新的 Pull request
- `Bug Fix`: 修复相关 Bug 的 Pull request
- `Docs`: 添加了文档说明的 Pull request
- `New Feature`: 添加了新功能的 Pull request
- `Feature`: 为现有功能提供选项或加成的 Pull request
- `Improvement`: 改进了 NexT 主题的 Pull request
- `i18n`: 更新了翻译的 Pull request
- `Performance`: 提高了 NexT 主题性能的 Pull request
- `Discussion`: 需要进行讨论的 Pull request
- `v6.x`: 与 NexT v6.x 旧版相关的用于修复和改进的 Pull request
- `v7.x`: 与 NexT v7.x 旧版相关的用于修复和改进的 Pull request

<a name="commit-messages-rules"></a>

### 提交信息规范

我们对项目的 git 提交信息格式进行统一格式约定，每条提交信息由 `type`+`subject` 组成，这将提升项目日志的可读性。

- `type` 用于表述此次提交信息的意义，首写字母大写，包括但不局限于如下类型：
    * `Build`：基础构建系统或依赖库的变化
    * `Ci`：CI 构建系统及其脚本变化
    * `Docs`：文档内容变化
    * `Feat`：新功能
    * `Fix`：Bug 修复
    * `Perf`：性能优化
    * `Refactor`：重构（即不是新增功能，也不是修改 Bug 的代码变动）
    * `Style`：格式（不影响代码运行的变动）
    * `Revert`：代码回滚
    * `Release`：版本发布
- `subject` 用于简要描述修改变更的内容，如 `Update code highlighting in readme.md`。
    * 句尾不要使用符号。
    * 使用现在时、祈使句语气。
