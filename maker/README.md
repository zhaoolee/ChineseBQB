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
7. 静态图最长边超过 1600 像素时会先缩小；导出尺寸等于编辑画布，不包含选框和手柄。

## OCR、模型和隐私

锁定版本是 `@paddleocr/paddleocr-js@0.4.2`（Apache-2.0）。识别使用 PP-OCRv5 mobile 的检测和识别模型，每轮在独立的模块 Worker 中运行。

- 两份权重在 `maker/public/models/`，开发和 Pages 都从 `/ChineseBQB/maker/models/` 加载。识别不会请求 `paddle-model-ecology.bj.bcebos.com`。
- 这些文件是模型，不是用户的图片。本应用没有把图片发给 OCR 服务的接口。
- OCR 程序独立打包，脚本下载失败时最多尝试三次，重试地址绕过浏览器缓存的失败结果；后续点「重新识别」仍可发起新请求，无需刷新页面。构建时检查 OCR 不会成为主页面的静态依赖。
- 模型按引擎请求下载，公共模型保存在浏览器 Cache Storage 中；存储不可用时仍可直接下载识别，不缓存用户图片。WASM 通过同源 URL 交给浏览器加载，不在运行库配置中额外保留完整字节副本。
- 资源下载最多等待 90 秒。失败时显示原因并提供「重新识别」，重试不会被上一轮失败的任务堵住。
- Vite 会把 `onnxruntime-web` 的 WASM 放进 `/ChineseBQB/maker/assets/`。应用自行管理 Worker，使用 OffscreenCanvas 读取识别像素，不启用 SDK 内置的 CDN Worker。
- 构建插件把锁定版本 OpenCV 的初始内存从 128 MiB 降到 32 MiB，同时修改 JavaScript 分配值和内嵌 WASM 的内存导入下限，保留原来的增长上限。构建时检查内存契约、数据段范围和 WASM 有效性；升级依赖后格式改变会阻止构建，须重新评估。
- OCR 始终从编辑像素生成输入，最长边限制在 480–640 像素，并把识别框按两个轴映射回画布；不会重新读取原始大图。
- 识别任务串行运行，切图后跳过过期任务。成功、失败、超时、切图和离开页面都会终止当前 Worker，释放其运行库上下文；内存分配失败后点击「重新识别」会创建新的 Worker。整轮最多等待 180 秒。识别期间暂不允许导出，避免两种高内存操作叠加。
- 模型文件缺失或初始化失败时显示错误，仍可手工加字并导出。浏览器进程被系统终止不属于可捕获的 JavaScript 错误。

## 已知限制

- 只保证近水平、字距较整齐、背景接近纯色的单行中文。竖排、大倾斜、透视和复杂背景会标成需要确认或手动处理。
- 识别出的格子沿用原文字的大小和颜色。字号、颜色、描边和粗细只在「添加文字」后的手工文字上设置。新字用系统中文无衬线字体，不能还原原图字体。
- 导出时会把擦除框外的像素恢复成原图，避免抗锯齿改到旁边的字，所以新字可能被框裁切。
- GIF 在解码像素前检查尺寸和帧数：边长最多 1600，完整动画最多 200 帧且总像素不超过 800 万；超过帧数或总像素预算时只解码首帧。
- 可完整编辑的 GIF 导出保留原来的帧间隔，同一处改字套到所有帧，使用一个复用画布逐帧编码。动画 WebP 只处理当前帧。
- 没有生成式补背景。模糊或取样不能当成智能修复。
- 仓库里的表情包素材不因为开源就自动获得商用授权。

## 测试

`maker/tests/maker.test.ts` 覆盖字符 diff、恶意 `src`、坐标往返、单字框不越过图片边界、纯色背景上 `明 → 红` 的框外像素不变、长度变化不自动擦图，以及撤销快照不保存图片字节。像素测试在内存里生成图，不读取仓库里的表情包原图。

`memory.test.ts`、`ocr-memory.test.ts` 和 `ocr-lifecycle.test.ts` 覆盖 GIF 分配预算、帧间隔、OCR 缩放、画布释放、WASM 内存导入契约，以及识别串行化、过期任务、Worker 释放和失败恢复。

真实 OCR 需要浏览器加载随项目发布的模型，不放进单元测试。手工冒烟：

1. 做一张白底黑字图，文字是 `小明，我想打你`；再做一张黑底白字带描边的图，文字是 `今天不上班`。
2. 在 Chrome 或 Safari 里上传，点识别，核对文字和整行框。
3. 把第一张的「明」改成「红」，确认提示是局部替换，导出的 PNG 里其余字仍是原图像素。
4. 去掉 `maker/models` 里的权重后再识别，确认失败提示还在，加字和导出仍能用。

没有在 CI 里跑 Playwright。上面的步骤就是浏览器回归清单。

## 模块下载恢复回归

2026-10-19：使用生产构建，在桌面 Safari 和 Chromium 中对 OCR 脚本注入连续三次 HTTP 503，再恢复请求；点击「重新识别」后，两者均在不刷新页面的情况下识别出样例图片的「丟人」。另验证了首次脚本请求失败后自动换地址重试成功。此项未代替 iPhone 真机验证。

## 真机回归记录

2026-10-20 内存修复本地回归：87 项单元测试、生产构建和 Pages 产物检查通过。Chromium 与桌面 Safari 分别连续刷新三次，均识别出同一张样例图片的「丟人」。Chromium 连续识别三轮，每轮结束后活动 Worker 数量均为 0；对真实运行库注入 `RangeError: Out of memory` 后，终止失败 Worker，再建 Worker 可成功识别。该样例中 OpenCV WASM 堆保持 32 MiB，ONNX Runtime 推理后约 87.75 MiB；此数值不包含页面、模型副本等其他内存。当前 iPhone 未连接，这轮尚未完成手机真机回归，不代表长期内存压力保证。

2026-10-19：在已连接的 iPhone 17 Pro Max（iOS 26.2 / Safari 26.2）上运行本地修复版，使用真实模型和合成图片完成以下检查，未观察到页面崩溃或自动刷新：

- 4000×3000 PNG 缩小为 1600×1200，识别出「今天不上班」，返回框全部位于编辑画布内。
- 替换文字并生成 PNG，解码确认导出尺寸为 1600×1200。
- 连续发起三次 OCR 请求，最终识别成功。
- 三帧 GIF 添加文字后导出并重新解码，帧间隔保留为 80 / 100 / 250 ms。
- 808 字节、1024×1024、25 帧的合成 GIF 超预算后只保留首帧，显示降级提示。
- 此轮采样的主线程最长间隔约 883 ms；未做所有机型或长期内存压力保证。

可在手机页面的远程 Web Inspector 控制台重新运行合成样例（需 `npm run dev`，图片不会上传）：

```js
import('/ChineseBQB/maker/tests/phone-smoke.ts').then(m => m.runPhoneSmoke())
```
