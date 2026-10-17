# ChineseBQB Maker

在现有表情包上改字。页面地址是 `/ChineseBQB/maker/`，和 Hugo 主站共用同一次 GitHub Pages 发布。图片、OCR、对比和导出都在浏览器里完成，没有账号，也没有上传图片的接口。

## 本地同时开两个服务

先启动 Hugo，让素材索引和原图可以从 `http://127.0.0.1:1313/ChineseBQB/` 访问：

```bash
python scripts/build_site.py serve
```

另开一个终端：

```bash
npm ci --prefix maker
npm run dev --prefix maker
```

打开 <http://localhost:5173/ChineseBQB/maker/>。Vite 把 `/ChineseBQB/catalog`、`/ChineseBQB/media` 和 `/ChineseBQB/thumbs` 代理到 Hugo。素材地址以 Hugo 站点为根，不会拼到 `/maker/media/`。

从分类页或搜索页预览一张图，点「制作同款」会打开 `maker/?src=media/<摘要>.<扩展名>`。GIF 会按整张动图改字；动画 WebP 只能改当前这一帧。

## 构建

和 GitHub Actions 的顺序一致。Hugo 会清空 `public-hugo/`，所以必须在 Hugo 构建之后再把 Vite 产物复制进去。

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
npm run typecheck --prefix maker
npm run test --prefix maker
python scripts/build_site.py build
npm run build --prefix maker
mkdir -p public-hugo/maker
cp -R maker/dist/. public-hugo/maker/
python scripts/verify_site.py
python scripts/check_maker.py
```

`npm run test` 已经是单次运行，不要再加 `--run`。

## 怎么改一张图

1. 选择索引里的图，或上传本地 PNG / JPEG / WebP / GIF。GIF 的改字会套到每一帧。动画 WebP 只能改当前这一帧。
2. 选中图片后会自动识别一轮。下面的按钮用来再识别一次。
3. 每一段文字拆成一个字一格。改格子里的字，或点加号再加一格。纯色背景会自动盖上。
4. 格子会在短暂停顿后直接改到图上。删掉一格只模糊那一个字的位置；在后面加上的字画在原句外面，原来的字保持不动。不是横排时才会盖住整行。
5. 单字位置是按整行估算的，不是模型返回的单字框。
6. 角点可以拖。撤销、重做和「还原原图」回放的是文字状态，每次都从原图像素重新合成。
7. 「导出 PNG」的尺寸等于原图，不包含选框和手柄。

## OCR、模型和隐私

锁定版本是 `@paddleocr/paddleocr-js@0.4.2`（Apache-2.0）。识别使用 PP-OCRv5 mobile 的检测和识别模型，WASM 在主线程运行。

- 两份权重在 `maker/public/models/`，开发和 Pages 都从 `/ChineseBQB/maker/models/` 加载。识别不会请求 `paddle-model-ecology.bj.bcebos.com`。
- 这些文件是模型，不是用户的图片。本应用没有把图片发给 OCR 服务的接口。
- Vite 会把 `onnxruntime-web` 的 WASM 放进 `/ChineseBQB/maker/assets/`。没有启用 Worker，因此不会改用 jsDelivr 上的 WASM。
- 模型文件缺失、浏览器没有足够内存，或 OpenCV 初始化失败时，识别会报错。加字和 PNG 导出仍然可用。

## 已知限制

- 只保证近水平、字距较整齐、背景接近纯色的单行中文。竖排、大倾斜、透视和复杂背景会标成需要确认或手动处理。
- 识别出的格子沿用原文字的大小和颜色。字号、颜色、描边和粗细只在「添加文字」后的手工文字上设置。新字用系统中文无衬线字体，不能还原原图字体。
- 导出时会把擦除框外的像素恢复成原图，避免抗锯齿改到旁边的字，所以新字可能被框裁切。
- GIF 导出保留每一帧和原来的帧间隔，同一处改字套到所有帧。不做逐帧不同的改法。动画 WebP 只能导出当前这一帧的 PNG。
- 没有生成式补背景。模糊或取样不能当成智能修复。
- 仓库里的表情包素材不因为开源就自动获得商用授权。

## 测试

`maker/tests/maker.test.ts` 覆盖字符 diff、恶意 `src`、坐标往返、单字框不越过图片边界、纯色背景上 `明 → 红` 的框外像素不变、长度变化不自动擦图，以及撤销快照不保存图片字节。像素测试在内存里生成图，不读取仓库里的表情包原图。

真实 OCR 需要浏览器加载随项目发布的模型，不放进单元测试。手工冒烟：

1. 做一张白底黑字图，文字是 `小明，我想打你`；再做一张黑底白字带描边的图，文字是 `今天不上班`。
2. 在 Chrome 或 Safari 里上传，点识别，核对文字和整行框。
3. 把第一张的「明」改成「红」，确认提示是局部替换，导出的 PNG 里其余字仍是原图像素。
4. 去掉 `maker/models` 里的权重后再识别，确认失败提示还在，加字和导出仍能用。

没有在 CI 里跑 Playwright。上面的步骤就是浏览器回归清单。
