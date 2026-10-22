# 实况照片检测

这是一个纯静态、无第三方依赖的本地诊断页：选择一张实况照片，自动查看浏览器实际交出了什么文件。页面**不向服务器发送所选文件**，也不写 `localStorage`；结果只留在当前页面内存里，刷新即消失。

页面自身只加载本页 HTML 与同目录的 `inspect.mjs`。

## 本地起服务

在**本目录**（`site/static/livephoto-test/`）执行：

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

然后让手机与这台电脑连同一个局域网，用浏览器打开：

```text
http://<电脑的局域网 IP>:8000/
```

macOS 上可以用 `ipconfig getifaddr en0` 查 Wi-Fi 的 IP。若打不开，检查 macOS 防火墙是否允许 Python 接收入站连接。

注意：这是 HTTP（非 HTTPS），`navigator.clipboard` 可能不可用，页面会自动给出可全选复制的文本作为降级；JSON 下载不受影响。

## Hugo 发布后的地址

`site/static` 是 Hugo 的静态目录，提交后由 GitHub Actions 构建，线上路径为：

```text
https://zhaoolee.com/ChineseBQB/livephoto-test/
```

页面只用相对路径引用同目录的 `inspect.mjs`，不依赖站点其他资源。

## 页面流程

1. 页面顶部只有一个主入口：真实可见的 `<input type="file" accept="image/*,video/*">`，单选，不设置 `capture`，标签为“选择实况照片”。
2. 选完文件后页面自动检查，不需要填写备注或配置，也不需要重复跑五组实验。
3. 默认结果区显示：
   - 易读主结论；
   - 收到的文件数量、图片/视频类型、是否解析到视频轨道、是否命中实况相关标识；
   - 若只收到图片，会明确写出“这次只收到图片，未拿到可用视频轨道”；
   - 紧凑文件卡：文件名、类型、大小；视频尺寸与时长；图片尺寸（浏览器能解码时）。
4. 每个文件卡片的“技术详情”折叠区内才显示：前 32 字节十六进制、签名、ISO BMFF/HEIF 结构、box 树、原始字节启发式扫描、UUID 候选、本地预览和原始 JSON。
5. 设备与浏览器信息会自动写入报告，不需要用户手动记录。

### 高级对照测试（可选）

默认关闭的“高级对照测试（可选）”里保留原来的 5 个入口及其 `accept` / `multiple` 参数，便于对照不同选择器的行为：

1. `accept="image/png,image/jpeg,image/webp,image/gif"`，单选
2. `accept="image/*"`，单选
3. `accept="image/*,video/*"`，多选
4. `accept="video/*"`，多选
5. 不写 `accept`，多选

页面主输入不计入这 5 个入口，是独立的新入口。高级测试的批次只在展开该区域时显示。

### 复制与导出

- **复制报告**：优先使用 Clipboard API；失败时展开可全选复制的文本框。
- **下载报告**：下载 JSON 报告。
- **清空**：清理当前页面会话的结果、预览和报告 URL。

报告包含页面/模块版本、`userAgent`、`platform`、`secureContext`、视口、入口定义、扫描限制、批次事件/时间/数量/状态、每文件预览状态与检查结果；**不含图片原始数据**（只有 32 字节头部十六进制）。设备与浏览器信息自动记录。

## 判读限制（重要）

- 字节命中、UUID 候选、签名都是**启发式**，不是完整 EXIF / MakerNote / QuickTime metadata 解析。
- **没有命中 LivePhoto 相关标记，不代表文件不是实况照片**；元数据可能在扫描范围外，或使用了其他键名。
- **UUID 候选相同不等于配对已证实**，只能说明字节层面出现过相同内容。
- HEIF 的 `hvc1` / `grid` 是图片 item，**不是视频帧**；只有 `moov/trak/mdia` 下 `hdlr = vide` 的轨道才计为视频轨道。
- 预览失败（HEIC、HEVC 常见）只说明浏览器解不了码，**不能**据此判断文件里没有图片或视频。
- 单个文件检查出错不会阻塞同批其他文件。
- 单文件读取预算：结构解析最多 1 MiB，原始字节扫描最多 7 MiB（合计 8 MiB）。该预算**只约束结构与标记检查**；浏览器为预览解码可能额外读取文件，不计入这 8 MiB。大文件只扫头/尾有限字节，页面会写出实际范围；范围外的标记不会被发现。
- 结构问题区分两类：**畸形**（box 声明长度小于头、头不完整、长度越界等）会停止该层解析，不再用后续内容推导轨道；**读取限制**（预算、box 数量、层深上限）只说明没读完。两者在页面和 JSON 里分别标记。
- 如果系统在选择器里直接取消且既没有触发 `cancel` 也没有 `change` 事件，页面无法得知这次取消，也不会编造记录。
- 结果只代表当前设备、系统、浏览器与相册格式选项下的这一次实测，**不能替代其他版本的实测**。

## 核心模块

`inspect.mjs` 不依赖 DOM，导出：

- `inspectFile(file)`：接受 File/Blob（Node 20+ 的 `File` 也可），返回可 JSON 序列化的诊断结果。
- `formatBytes(n)`、`INSPECTOR_VERSION`、`LIMITS`。

可在 Node 中直接验证，例如：

```bash
node --input-type=module -e "
import { inspectFile } from './inspect.mjs';
import { readFile, stat } from 'node:fs/promises';
const p = '/path/to/IMG_0001.HEIC';
const st = await stat(p);
const file = new File([await readFile(p)], 'IMG_0001.HEIC', { type: 'image/heic', lastModified: st.mtimeMs });
const r = await inspectFile(file);
console.log(JSON.stringify({ signature: r.signature, heif: r.heif, tracks: r.tracks, markers: r.markers.hits, boxes: r.boxes.boxCount }, null, 2));
"
```

结构解析对普通 box、64 位 `largesize`、`size=0`、越界与不前进的长度都做了防护，并限制层深、box 数量和读取总量，避免异常文件造成死循环。声明长度小于 box 头时会停止该层解析并记入 `boxes.issues`（`boxes.malformed`），不会补齐长度继续推导轨道；预算/数量/层深上限则标记为 `boxes.truncated`。
