# 只管理 BQB 文件夹，自动更新网页

线上地址：<https://zhaoolee.com/ChineseBQB/#/>。

本网站由 Hugo 生成，GitHub Actions 在 `master` 更新后自动构建和发布到 GitHub Pages。页面、图片、搜索索引、字体全部同源托管，不依赖 v2fy、WordPress、第三方图片 CDN 或数据库。

## 日常维护

在仓库根目录创建以 `BQB` 结尾的文件夹，把图片放进去，再提交并推送到 `master`：

```text
ChineseBQB/
├── 110_AI_人工智能_BQB/
│   ├── 人工智能00001-嘘.jpg
│   └── 人工智能00002-去别的地方玩.gif
└── 111_新的分类_BQB/
    └── 今天也要开心.png
```

也可以在 GitHub 网页上上传图片。文件进入 `master` 后，等待仓库 Actions 中的 **Build and deploy ChineseBQB** 完成，网页就会更新。

README 的分类目录也会自动更新：页面部署成功后，Actions 将本次发布的目录写回 `README.md`，由 `github-actions[bot]` 提交到 `master`。日常只需管理 BQB 文件夹及图片。

- **分类**：自动扫描根目录中以 `BQB` 结尾的文件夹（大小写均可），不需要额外维护列表、Markdown、封面配置或 JSON。
- **标题**：自动去掉开头编号、用下划线分开的英文前缀和末尾 `BQB`，保留中文、emoji 及 `JOJO的奇妙冒险` 这类中英混合名称。没有中文时使用剩余名称。
- **排序**：编号越大越靠前，无编号的社区分类放在后面。
- **链接**：使用完整文件夹名，英文统一小写，保留编号、下划线、中文及 emoji。例如 `109_Opossum_负鼠_BQB` 对应 `/ChineseBQB/109_opossum_负鼠_bqb/`。浏览器可能将中文显示为百分号编码，二者是同一地址。目录更名后路由也会变化，不保留旧路径或跳转；编号不可重复。
- **封面**：优先选择与目录编号一致的纯数字文件名（如 `0000000110.jpg`），否则使用自然排序后的第一张图片。不需要手动配置。首页和 README 的 GIF 等动图封面直接使用原图播放动画，静态封面使用缩略图。
- **图片**：支持 JPG / JPEG / JFIF / PNG / GIF / WebP / AVIF / BMP，扩展名大小写均可，支持子目录。隐藏文件、非图片和符号链接不会发布。损坏图片会令构建失败，保留上一次成功的网站。
- **删除**：删除目录或图片并推送后，对应页面、索引和图片会从新发布内容中移除；空目录只有提交了占位文件才能被 Git 跟踪，空分类显示等待图片的提示。
- **搜索**：按分类名及图片文件名搜索，也支持多个以空格分隔的关键词。不会识别图片中的文字，建议给图片起有意义的名字。
- **下载**：README 的“直链下载”直接获取自动生成的分类 ZIP，托管于本仓库 GitHub Releases；网页中的打包下载也可在浏览器即时生成。两者均保留原文件内容、中文文件名和子目录。分类内的图片网格和搜索结果使用首帧缩略图，预览和下载保留动图。

## README 自动生成规则

- 与网站共用同一份分类数据，自动更新分类顺序、封面、分类数量、图片总数和完整文件夹路由，新增、更名、删除都会同步。
- 静态封面使用本次发布的 GitHub Pages 缩略图，GIF 等动图封面使用发布的原图，保留动画；分类链接使用 `hugo.toml` 中的正式 `baseURL`，英文转小写、保留中文和 emoji，不添加旧站参数或兼容路径。
- “直链下载”直接指向本仓库 `bqb-downloads` Release 的 ZIP 附件，无需进入分类页。构建根据当前文件夹重新生成合集，图片内容或文件名变化后更新下载链接；相同内容复用已有附件，不依赖仓库中历史 ZIP。
- 压缩包保留原图及目录内文件名，下载文件名包含内容摘要。ZIP 单独托管于 GitHub Releases，不占 GitHub Pages 的站点容量，也不提交进 Git 历史。发布前检查全部 ZIP 的完整性、大小及 SHA-256；上传成功后才部署网页并更新 README。
- 新版本上线后自动清理不再使用的压缩包，保留当前网站和 README 引用的附件。
- 仅替换 `<!-- BQB-DIRECTORY:START -->` 与 `<!-- BQB-DIRECTORY:END -->` 之间的内容；可自由编辑标记之外的介绍和故事，请保留这两个标记。
- 内容相同不产生新提交，不按日期制造变化。构建或部署失败时不更新 README；如果分支已有更新，旧构建不覆盖新提交，由下一次发布同步目录。自动提交使用工作流自身的 `GITHUB_TOKEN`，不需要额外密钥。

本地 `build` 会生成 `.hugo-generated/readme-directory.md`，供检查本次将发布的 README 目录。要在本地提前应用这份目录，构建后运行：

```bash
python scripts/update_readme.py apply
```

生产流程在 ZIP 上传和页面部署成功后自动执行这一步。仓库写入权限仅授予 ZIP 发布和 README 更新工作；PR 构建只生成和检查，不会发布附件或提交修改。

## 本地预览

需要 Hugo 0.162.1 或更新版本，以及 Python 3.10+。首次安装图片处理依赖：

```bash
python3 -m venv .venv-site
source .venv-site/bin/activate
python -m pip install -r requirements-site.txt
python scripts/build_site.py serve
```

打开 <http://localhost:1313/ChineseBQB/#/>。预览会监测 BQB 文件夹的新增、更名、删除及图片变化，重新生成页面。

构建及检查：

```bash
source .venv-site/bin/activate
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/build_site.py build
python scripts/verify_site.py
```

激活环境后也可使用 `npm run dev`、`npm run build`、`npm test`。`package.json` 只提供这三个快捷命令，没有 npm 依赖，无需 `npm install`。Python 依赖统一在 `requirements-site.txt` 中维护，目前仅有 Pillow。Node 仅用于浏览器 ZIP 格式测试；GitHub runner 已提供 Node。

## GitHub Pages 设置

首次启用时，仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。默认分支为 `master`，工作流是 `.github/workflows/pages.yml`。

项目站点继承 `zhaoolee.github.io` 的自定义域名 `zhaoolee.com`，Hugo `baseURL` 为 `https://zhaoolee.com/ChineseBQB/`，不要在本项目的发布产物里添加 `CNAME`，也不要把项目路径当作自定义域名。

所有页面都是真实静态路径，分类页可以直接打开和刷新。例如：

```text
/ChineseBQB/                           首页
/ChineseBQB/109_opossum_负鼠_bqb/       负鼠分类
/ChineseBQB/110_ai_人工智能_bqb/        人工智能分类
/ChineseBQB/search/?q=人工智能         搜索
```

不生成 `categories/bqb-109` 短路径，不生成旧路径别名或重定向，不处理 hash 路由或旧 `key_val` 搜索参数。首页 URL 末尾的 `#/` 只是浏览器片段，不参与路由。

每次构建先测试，再生成缩略图和静态页、检查全部本地链接与图片、最后上传并部署。原图按内容摘要存储，重复图片只占一份空间；缩略图有独立缓存。Pages 发布内容不能超过 1 GB，脚本会在到达上限时阻止发布，避免用不完整产物覆盖线上站点。

## 项目结构

```text
hugo.toml                 Hugo 配置及 /ChineseBQB/ 路径
scripts/build_site.py      从 BQB 目录提取内容、生成缩略图、构建及预览
scripts/verify_site.py     检查产物、子目录链接、搜索数据及图片
scripts/update_readme.py   生成 README 分类目录，按标记更新手写文档
scripts/publish_downloads.py 上传、校验及清理自动生成的 Release ZIP
site/layouts/             Hugo 模板
site/assets/              样式和浏览器交互
site/static/assets/       从参考站复用的背景、字体及本项目图标
tests/                    目录生命周期、GIF 和 ZIP 的回归验证
.hugo-generated/          自动生成的内容、数据、图片、ZIP（不提交）
.hugo-cache/              缩略图缓存（不提交）
public-hugo/              唯一的 Pages 发布目录（不提交）
```

UI 复用 `zhaoolee.github.io` 的 OPPOSans、木纹背景、暖白纸张、双边框与左侧目录，再针对表情包增加分类卡片和图片预览。字体及背景来自同一作者的参考项目。

发布流程统一为：BQB 文件夹 → Hugo 页面及图片索引 → GitHub Releases ZIP → GitHub Pages → README 自动目录。WordPress 的 Python/JavaScript 上传器、旧服务器同步、旧版打包及 README 覆写脚本、专用配置和依赖均已移除。

开放数据使用网站自动生成的 `catalog/index.json`（分类目录）和 `catalog/search.json`（完整图片索引）。其中的相对路径以 Hugo `baseURL` 为起点解析，与网页和 README 同步更新。

`chinesebqb-md` 中的文章及插图、旧 Hexo 的配置/主题/`docs` 和旧 JSON 文件仅作为历史资料，不参与构建。日常维护只需提交 BQB 图片目录，静态站生成结果不需要提交，README 目录由工作流自动写回，不作为网站的数据源。

参考：[Hugo 的 GitHub Pages 部署说明](https://gohugo.io/host-and-deploy/host-on-github-pages/)、[GitHub Pages 容量限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。
