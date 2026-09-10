# ChineseBQB 项目经验

这里记录本项目已确认的维护流程、设计约定和发布经验，后续经验继续放在 `memory/` 下。

记录日期：2026-09-10。流程依据：[自动发布配置](../.github/workflows/pages.yml)；详细说明见 [HUGO.md](../HUGO.md)。

## 日常提交：先拉取，再修改、提交、推送

用户明确要求：日常流程优先先同步远端，再开始本地修改。不要把日常操作简化成只有 `git add`、`git commit`、`git push`，遗漏远端同步。

原因：每次部署成功后，GitHub Actions 可能自动更新根目录 `README.md` 并提交到 `master`。即使没有其他人提交代码，远端也可能比本地多一个提交。

在仓库根目录、`master` 分支上，尚未开始修改且工作区干净时：

```bash
git pull --ff-only origin master

# 修改 BQB 文件夹和图片

git add .
git commit -m "更新表情包"
git push origin master
```

`git add .` 会包含当前目录下全部未忽略的改动；有其他未完成工作时，只添加本次要发布的文件。

### 已经改好文件时

如果已经有本地修改，可以先保存为本地提交，再同步、推送：

```bash
git add .
git commit -m "更新表情包"
git pull --rebase origin master
git push origin master
```

`commit` 只保存到本地，`push` 才上传。这是已经开始编辑后的处理方式，日常从头操作仍优先使用“先 pull”的流程。

如果最开始拉取后，机器人又提交了 README，导致推送提示远端领先，先 `git pull --rebase origin master`，再 `git push origin master`。有冲突时解决冲突、添加已解决的文件并运行 `git rebase --continue`，完成后再推送；不要强制推送覆盖远端提交。

## 推送后自动完成的工作

推送到 `master` 后，[GitHub Actions](https://github.com/zhaoolee/ChineseBQB/actions) 的 **Build and deploy ChineseBQB** 依次执行：

1. 测试、扫描 BQB 文件夹、生成 Hugo 页面与搜索索引，并检查图片和页面引用。
2. 生成、发布并核对各分类的 ZIP 下载合集，托管于 GitHub Releases。
3. 部署到 [GitHub Pages 正式站点](https://zhaoolee.com/ChineseBQB/)。
4. 部署成功后更新 README 自动目录；内容有变化才产生机器人提交，并清理不再使用的自动 ZIP。

日常维护只需管理文件夹和图片，云端会自动构建。以这次提交对应的整条工作流成功为发布完成依据，不能只看 `git push` 成功或单个构建阶段变绿。PR 检查不会发布生产。

README 的 `<!-- BQB-DIRECTORY:START -->` 与 `<!-- BQB-DIRECTORY:END -->` 之间由程序维护，保留边界标记；介绍、故事等手写内容放在标记之外。

## 已确认的生成规则

- 自动扫描仓库根目录中以 `BQB` 结尾的文件夹。新增、更名、删除文件夹或图片后，页面、索引、README 与下载合集自动同步。
- 分类编号保持唯一；公开路径使用完整文件夹名，英文转小写，保留中文、下划线和 emoji。例如 `109_Opossum_负鼠_BQB` 对应 `/ChineseBQB/109_opossum_负鼠_bqb/`。
- 不保留错误短路径、旧路径别名或兼容跳转；分类更名后使用新路径。
- 分类封面优先使用与目录编号一致的纯数字文件名，否则使用自然排序后的第一张图。首页和 README 的动图封面使用原图，保留 GIF 动画；静态封面使用缩略图。
- 分类内图片网格和搜索结果使用缩略图；放大预览、保存原图和 ZIP 下载保留原始图片及动画。
- README 分类入口指向正式 GitHub Pages 分类地址；“直链下载”直接指向 GitHub Releases 的 ZIP 附件。
- 发布流程已移除 WordPress 同步链路，维护时不再接回旧同步代码。

## 发布验收与同时编辑的经验

- 发布和验收绑定明确的源提交。核对线上分类数量、README 与 ZIP 是否对应同一批图片，并实际检查 GIF 预览和下载内容。
- 部署期间如果本地继续编辑，验收时用已发布提交中的文件核对，不能用正在变化的工作区文件比较 ZIP。
- 后续编辑保留在本地；需要随下一次提交发布。说明本次发布范围，不把部署期间尚未提交的改动说成已上线。
- 同步机器人生成的 README 时保留本地图片编辑，不重置、覆盖或夹带无关改动。
- 内置浏览器连接失败不等于部署失败。结合工作流和正式站点响应判断，并明确说明哪些线上交互尚未验证。
