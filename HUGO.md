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

- **分类**：自动扫描根目录中以 `BQB` 结尾的文件夹，兼容现有命名，不需要额外维护列表、Markdown、封面配置或 JSON。
- **标题**：自动去掉开头编号、用下划线分开的英文前缀和末尾 `BQB`，保留中文、emoji 及 `JOJO的奇妙冒险` 这类中英混合名称。没有中文时使用剩余名称。
- **排序**：编号越大越靠前，无编号的社区分类放在后面。
- **链接**：`110_…BQB` 对应 `/ChineseBQB/categories/bqb-110/`。保持编号不变即可更名而不破坏链接；编号不可重复。改编号视为删除旧分类并新增分类。无编号分类链接由完整目录名决定。
- **封面**：优先选择与目录编号一致的纯数字文件名（如 `0000000110.jpg`），否则使用自然排序后的第一张图片。不需要手动配置。
- **图片**：支持 JPG / JPEG / JFIF / PNG / GIF / WebP / AVIF / BMP，扩展名大小写均可，支持子目录。隐藏文件、非图片和符号链接不会发布。损坏图片会令构建失败，保留上一次成功的网站。
- **删除**：删除目录或图片并推送后，对应页面、索引和图片会从新发布内容中移除；空目录只有提交了占位文件才能被 Git 跟踪，空分类显示等待图片的提示。
- **搜索**：按分类名及图片文件名搜索，也支持多个以空格分隔的关键词。不会识别图片中的文字，建议给图片起有意义的名字。
- **下载**：单图下载保留原文件内容；分类 ZIP 点击时在浏览器中生成，支持中文文件名和子目录。GIF 在列表中显示首帧缩略图，预览和下载保留动图。

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

激活环境后也可使用 `npm run dev`、`npm run build`、`npm test`；新网站无需 `npm install`。Node 仅用于 ZIP 格式测试；GitHub runner 已提供 Node。

## GitHub Pages 设置

首次启用时，仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。默认分支为 `master`，工作流是 `.github/workflows/pages.yml`。

项目站点继承 `zhaoolee.github.io` 的自定义域名 `zhaoolee.com`，Hugo `baseURL` 为 `https://zhaoolee.com/ChineseBQB/`，不要在本项目的发布产物里添加 `CNAME`，也不要把项目路径当作自定义域名。

所有路径都经过 Hugo 的子目录处理，支持首页 `#/`、直接打开分类链接和刷新。`#/search?q=关键词`、`#/categories/bqb-110/` 会转到对应的 Hugo 静态页面，旧 `?key_val=关键词` 搜索分享链接也会继续工作。

每次构建先测试，再生成缩略图和静态页、检查全部本地链接与图片、最后上传并部署。原图按内容摘要存储，重复图片只占一份空间；缩略图有独立缓存。Pages 发布内容不能超过 1 GB，脚本会在到达上限时阻止发布，避免用不完整产物覆盖线上站点。

## 项目结构与旧流程

```text
hugo.toml                 Hugo 配置及 /ChineseBQB/ 路径
scripts/build_site.py      从 BQB 目录提取内容、生成缩略图、构建及预览
scripts/verify_site.py     检查产物、子目录链接、搜索数据及图片
site/layouts/             Hugo 模板
site/assets/              样式和浏览器交互
site/static/assets/       从参考站复用的背景、字体及本项目图标
tests/                    目录生命周期、GIF 和 ZIP 的回归验证
.hugo-generated/          自动生成的内容、数据、图片（不提交）
.hugo-cache/              缩略图缓存（不提交）
public-hugo/              唯一的 Pages 发布目录（不提交）
```

UI 复用 `zhaoolee.github.io` 的 OPPOSans、木纹背景、暖白纸张、双边框与左侧目录，再针对表情包增加分类卡片和图片预览。字体及背景来自同一作者的参考项目。

旧项目中的 `build.js` 负责压缩 ZIP、生成 `chinesebqb-md` 并更新 README；`create_bqb_image_list.js` 生成 GitHub / v2fy 两套数据源；`rsync.js` / `push.js` 负责旧服务器同步；Hexo 配置、主题及 `docs` 则用于旧静态站。此前 Pages 发布的是 `master:/docs`。

这些旧文件保留作历史参考，新工作流不读取、不运行、不修改它们。旧命令更名为 `npm run legacy:build` 和 `npm run legacy:push`；旧 push 命令会同步服务器并提交全部变化，仅在明确需要旧流程时手动使用。日常维护只需提交 BQB 图片目录，生成结果不需要提交，README 的旧目录表也不再作为新网站数据源。

参考：[Hugo 的 GitHub Pages 部署说明](https://gohugo.io/host-and-deploy/host-on-github-pages/)、[GitHub Pages 容量限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。
