/**
 * inspect.mjs — 本地、无网络、无第三方依赖的文件诊断模块。
 *
 * 设计目标：
 * - 只读取浏览器实际交出的 File 对象（Node 20+ 的 File 同样适用）。
 * - 不依赖 DOM / window / navigator，可在 Node 中用 File API 直接验证。
 * - 所有结论都标注证据来源：签名、ISO BMFF box 结构、原始字节启发式扫描。
 * - 不承诺完整解析 EXIF / MakerNote / QuickTime metadata。
 *
 * 输出只包含文件元信息、结构摘要与有限字节的启发式命中，不包含图片原始数据。
 */

export const INSPECTOR_VERSION = '1.1.0';

/** 固定预算。页面与 README 都会展示这些数字。 */
export const LIMITS = Object.freeze({
  totalReadBytes: 8 * 1024 * 1024, // 单文件最多读取 8 MiB
  structureReadBytes: 1024 * 1024, // 其中结构解析最多 1 MiB
  scanReadBytes: 7 * 1024 * 1024, // 其中原始字节扫描最多 7 MiB
  maxBoxes: 3000,
  maxBoxesPerContainer: 512,
  maxDepth: 6,
  maxItems: 128,
  maxUuidCandidates: 32,
  headBytes: 32,
  scanChunkBytes: 256 * 1024,
  scanOverlapBytes: 64,
  markerCountCap: 999,
});

const CONTAINER_TYPES = new Set([
  'moov', 'trak', 'mdia', 'minf', 'stbl', 'meta', 'iprp', 'ipco',
  'udta', 'edts', 'dinf', 'mvex', 'sinf', 'schi', 'meco', 'mfra',
]);

/** 原始字节扫描的标记。全部按 ASCII 大小写不敏感匹配。 */
const MARKER_DEFS = [
  { id: 'exif', label: 'Exif', need: 'exif' },
  { id: 'content-identifier', label: 'com.apple.quicktime.content.identifier', need: 'com.apple.quicktime.content.identifier' },
  { id: 'still-image-time', label: 'still-image-time', need: 'still-image-time' },
  { id: 'live-photo', label: 'LivePhoto', need: 'livephoto' },
  { id: 'live-photo-dash', label: 'live-photo', need: 'live-photo' },
  { id: 'motion-photo', label: 'MotionPhoto', need: 'motionphoto' },
  { id: 'motion-photo-dash', label: 'motion-photo', need: 'motion-photo' },
  { id: 'quicktime', label: 'QuickTime（品牌/键名）', need: 'quicktime' },
].map((def) => ({ ...def, codes: Uint8Array.from(def.need, (c) => c.charCodeAt(0)) }));

const IMAGE_ITEM_TYPES = new Set(['grid', 'hvc1', 'hev1', 'av01', 'jpeg', 'j2k1', 'iden', 'iovl', 'vvc1']);
const HEIF_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'mif2', 'msf1']);
const AVIF_BRANDS = new Set(['avif', 'avis']);
const MP4_BRANDS = new Set([
  'isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'iso8', 'iso9', 'mp41', 'mp42',
  'dash', 'M4V ', 'M4A ', 'M4P ', 'MSNV', 'f4v ', '3gp4', '3gp5', '3gp6', '3g2a',
]);

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

const ascii = (bytes, offset, length) => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const b = bytes[offset + i];
    if (b === undefined) break;
    out += String.fromCharCode(b);
  }
  return out;
};

const isPrintableType = (s) => /^[\x20-\x7e]{4}$/.test(s);

const be16 = (b, o) => (b[o] << 8) | b[o + 1];
const be32 = (b, o) => b[o] * 16777216 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const be64 = (b, o) => {
  const hi = be32(b, o);
  const lo = be32(b, o + 4);
  const v = hi * 4294967296 + lo;
  return Number.isSafeInteger(v) ? v : Number.MAX_SAFE_INTEGER;
};

const uniq = (list) => Array.from(new Set(list));

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '未知';
  if (n < 1024) return `${n} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = n;
  let i = -1;
  do {
    value /= 1024;
    i += 1;
  } while (value >= 1024 && i < units.length - 1);
  return `${value.toFixed(2)} ${units[i]}`;
}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');

const uuidFromBytes = (bytes) => {
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32),
  ].join('-');
};

const latin1 = (bytes) => {
  let out = '';
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + step, bytes.length)));
  }
  return out;
};

/** 大小写不敏感的 ASCII 子串查找，返回起始下标或 -1。 */
function indexOfAscii(hay, codes, from = 0) {
  const last = hay.length - codes.length;
  for (let i = Math.max(0, from); i <= last; i += 1) {
    let ok = true;
    for (let k = 0; k < codes.length; k += 1) {
      if ((hay[i + k] | 0x20) !== codes[k]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

/* ------------------------------------------------------------------ */
/* 读取器：统一预算                                                    */
/* ------------------------------------------------------------------ */

function createReader(file, limits) {
  const state = {
    totalUsed: 0,
    structureUsed: 0,
    scanUsed: 0,
    structureExhausted: false,
    scanExhausted: false,
    totalExhausted: false,
  };

  async function readAt(offset, length, kind = 'structure') {
    if (!(length > 0)) return new Uint8Array(0);
    const start = Math.max(0, Math.floor(offset));
    if (!Number.isFinite(start) || start >= file.size) return new Uint8Array(0);
    const maxLen = Math.min(Math.floor(length), file.size - start);
    if (maxLen <= 0) return new Uint8Array(0);

    const totalLeft = limits.totalReadBytes - state.totalUsed;
    const kindLeft = kind === 'scan'
      ? limits.scanReadBytes - state.scanUsed
      : limits.structureReadBytes - state.structureUsed;
    const allowed = Math.min(maxLen, totalLeft, kindLeft);
    if (allowed <= 0) {
      if (kind === 'scan') state.scanExhausted = true;
      else state.structureExhausted = true;
      if (totalLeft <= 0) state.totalExhausted = true;
      return new Uint8Array(0);
    }
    if (allowed < maxLen) {
      if (kind === 'scan') state.scanExhausted = true;
      else state.structureExhausted = true;
      if (totalLeft === allowed) state.totalExhausted = true;
    }

    const buffer = await file.slice(start, start + allowed).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    state.totalUsed += bytes.length;
    if (kind === 'scan') state.scanUsed += bytes.length;
    else state.structureUsed += bytes.length;
    return bytes;
  }

  return { readAt, state };
}

/* ------------------------------------------------------------------ */
/* ISO BMFF / HEIF box 解析                                            */
/* ------------------------------------------------------------------ */

async function readBoxHeader(reader, offset, limit) {
  const want = Math.min(32, limit - offset);
  const head = await reader.readAt(offset, want, 'structure');
  if (head.length < 8) {
    // 读不满是因为预算耗尽时，不能当成畸形结构。
    if (head.length < want && (reader.state.structureExhausted || reader.state.totalExhausted)) {
      return { budget: true, offset };
    }
    return { malformed: true, offset, reason: `box 头不足 8 字节（只读到 ${head.length} 字节）` };
  }
  const sizeField = be32(head, 0);
  const type = ascii(head, 4, 4);
  if (!isPrintableType(type)) {
    return { malformed: true, offset, reason: 'box 类型不是可打印 ASCII' };
  }

  let declaredSize = sizeField;
  let headerSize = 8;

  if (sizeField === 1) {
    if (head.length < 16) {
      if (head.length < want && (reader.state.structureExhausted || reader.state.totalExhausted)) {
        return { budget: true, offset };
      }
      return { malformed: true, offset, type, reason: '64 位 largesize 头不足 16 字节' };
    }
    declaredSize = be64(head, 8);
    headerSize = 16;
  } else if (sizeField === 0) {
    declaredSize = limit - offset; // 延伸到父级末尾
  }

  // 声明长度小于头本身：畸形。停止该层解析，不能补齐后继续推导结构。
  if (!(declaredSize >= headerSize)) {
    return {
      malformed: true,
      offset,
      type,
      declaredSize,
      headerSize,
      reason: `声明长度 ${declaredSize} 小于 box 头 ${headerSize} 字节`,
    };
  }

  const end = Math.min(offset + declaredSize, limit);
  const truncated = end < offset + declaredSize;

  return {
    type,
    offset,
    sizeField,
    headerSize,
    payloadOffset: offset + headerSize,
    end,
    truncated,
  };
}

function parseFtyp(payload) {
  if (payload.length < 8) return null;
  const majorBrand = ascii(payload, 0, 4).trim();
  const minorVersion = be32(payload, 4);
  const compatibleBrands = [];
  for (let o = 8; o + 4 <= payload.length && compatibleBrands.length < 32; o += 4) {
    const brand = ascii(payload, o, 4).trim();
    if (brand) compatibleBrands.push(brand);
  }
  return { majorBrand, minorVersion, compatibleBrands };
}

function parseInfe(payload) {
  if (payload.length < 8) return null;
  const version = payload[0];
  let o = 4;
  let itemId = 0;
  let protectionIndex = 0;
  let itemType = '';
  if (version >= 3) {
    if (payload.length < 14) return null;
    itemId = be32(payload, o); o += 4;
    protectionIndex = be16(payload, o); o += 2;
  } else if (version >= 2) {
    itemId = be16(payload, o); o += 2;
    protectionIndex = be16(payload, o); o += 2;
  } else {
    itemId = be16(payload, o); o += 2;
    protectionIndex = be16(payload, o); o += 2;
    o += 4; // data_reference_index
  }
  if (version >= 2) {
    if (o + 4 > payload.length) return null;
    itemType = ascii(payload, o, 4);
    o += 4;
  }
  let name = '';
  for (let i = o; i < payload.length && i < o + 128; i += 1) {
    if (payload[i] === 0) break;
    name += String.fromCharCode(payload[i]);
  }
  return { version, itemId, protectionIndex, itemType, name };
}

function parseIinf(payload, cap) {
  if (payload.length < 6) return [];
  const version = payload[0];
  let o = 4 + (version === 0 ? 2 : 4);
  const items = [];
  let guard = 0;
  while (o + 8 <= payload.length && items.length < cap && guard < cap * 2) {
    guard += 1;
    const size = be32(payload, o);
    const type = ascii(payload, o + 4, 4);
    if (size < 8 || !isPrintableType(type)) break;
    const end = Math.min(o + size, payload.length);
    if (type === 'infe') {
      const infe = parseInfe(payload.subarray(o + 8, end));
      if (infe) items.push(infe);
    }
    o += size;
  }
  return items;
}

function parseStsd(payload) {
  if (payload.length < 8) return { count: 0, entries: [] };
  const count = be32(payload, 4);
  const entries = [];
  let o = 8;
  let guard = 0;
  while (o + 8 <= payload.length && entries.length < 32 && guard < 64) {
    guard += 1;
    const size = be32(payload, o);
    const type = ascii(payload, o + 4, 4);
    if (size < 8 || !isPrintableType(type)) break;
    entries.push({ type, size });
    o += size;
  }
  return { count, entries };
}

async function metaChildrenStart(reader, start, end) {
  const peek = await reader.readAt(start, Math.min(16, end - start), 'structure');
  if (peek.length < 12) return null;
  const innerSize = be32(peek, 4);
  const innerType = ascii(peek, 8, 4);
  // ISO 风格：version/flags(4) + 子 box；此时 4..8 是子 box 的 size。
  if (isPrintableType(innerType) && innerSize >= 8) return start + 4;
  // QuickTime 风格：没有 version/flags。
  if (isPrintableType(ascii(peek, 4, 4))) return start;
  return start + 4;
}

async function handleFtyp(reader, box, ctx) {
  const payload = await reader.readAt(box.payloadOffset, Math.min(512, box.end - box.payloadOffset), 'structure');
  ctx.ftyp = parseFtyp(payload);
}

async function handleHdlr(reader, box, ctx, path) {
  const payload = await reader.readAt(box.payloadOffset, Math.min(64, box.end - box.payloadOffset), 'structure');
  if (payload.length < 12) {
    ctx.issues.push(`hdlr 位于 ${box.offset}，负载不足 12 字节`);
    return;
  }
  const handlerType = ascii(payload, 8, 4);
  const parent = path.slice(0, -1);
  // 只有 trak/mdia 下的 hdlr 才代表媒体轨道的 handler；
  // QuickTime 的 udta/meta 里也有 hdlr（例如 alis / mdta），不属于轨道。
  const isTrackHandler = ctx.currentTrack && parent[parent.length - 1] === 'mdia' && parent.includes('trak');
  if (isTrackHandler) {
    ctx.currentTrack.handlerTypes.push(handlerType);
  } else {
    ctx.otherHandlerTypes.push({ handlerType, path: parent.join('/') });
  }
}

async function handleStsd(reader, box, ctx, path) {
  const payload = await reader.readAt(box.payloadOffset, Math.min(8192, box.end - box.payloadOffset), 'structure');
  if (payload.length < 8) {
    ctx.issues.push(`stsd @${box.offset} 负载不足 8 字节，未解析 sample entry`);
    return;
  }
  const parsed = parseStsd(payload);
  const inTrack = Boolean(ctx.currentTrack) && path.includes('moov') && path.includes('trak') && path.includes('stbl');
  if (inTrack) {
    ctx.currentTrack.sampleEntries.push(...parsed.entries);
  } else {
    ctx.sampleEntries.push(...parsed.entries);
  }
  if (parsed.entries.length < parsed.count) {
    ctx.issues.push(`stsd 声明 ${parsed.count} 个 sample entry，仅解析到 ${parsed.entries.length} 个（读取上限）`);
  }
}

async function handleIinf(reader, box, ctx) {
  const payload = await reader.readAt(box.payloadOffset, Math.min(32768, box.end - box.payloadOffset), 'structure');
  const items = parseIinf(payload, LIMITS.maxItems);
  ctx.heifItems.push(...items);
  if (box.end - box.payloadOffset > payload.length) {
    ctx.issues.push('iinf 超过 32 KiB 读取上限，后段 item 未解析');
  }
}

async function handleUuid(reader, box, ctx) {
  const payload = await reader.readAt(box.payloadOffset, Math.min(16, box.end - box.payloadOffset), 'structure');
  if (payload.length < 16) {
    ctx.issues.push(`uuid box 位于 ${box.offset}，user type 不足 16 字节`);
    return;
  }
  const uuid = uuidFromBytes(payload);
  ctx.uuidCandidates.push({ uuid, source: 'uuid box', offset: box.offset, type: box.type });
}

async function handleBox(reader, ctx, box, path) {
  switch (box.type) {
    case 'trak':
      // 进入 trak：后续 hdlr / stsd 归到这条轨道
      ctx.currentTrack = {
        offset: box.offset,
        handlerTypes: [],
        sampleEntries: [],
      };
      ctx.tracks.push(ctx.currentTrack);
      return;
    case 'ftyp': await handleFtyp(reader, box, ctx); return;
    case 'hdlr': await handleHdlr(reader, box, ctx, path); return;
    case 'stsd': await handleStsd(reader, box, ctx, path); return;
    case 'iinf': await handleIinf(reader, box, ctx); return;
    case 'uuid': await handleUuid(reader, box, ctx); return;
    default:
  }
}

async function walkBoxes(reader, ctx, start, end, depth, path = []) {
  const nodes = [];
  let offset = start;
  let iterations = 0;

  while (offset + 8 <= end) {
    if (iterations >= LIMITS.maxBoxesPerContainer || ctx.boxCount >= LIMITS.maxBoxes) {
      ctx.truncated = true;
      ctx.issues.push(`box 数量达到上限（每层 ${LIMITS.maxBoxesPerContainer} / 总计 ${LIMITS.maxBoxes}），后续未解析`);
      break;
    }
    iterations += 1;

    const header = await readBoxHeader(reader, offset, end);
    if (header.budget) {
      ctx.issues.push(`结构读取预算耗尽（偏移 ${offset}），剩余 box 未解析；这是读取限制，不是文件畸形`);
      ctx.truncated = true;
      break;
    }
    if (header.malformed) {
      ctx.issues.push(`偏移 ${offset} 处结构畸形：${header.reason}；已停止该层解析，后续内容不再用于推导轨道`);
      ctx.malformed = true;
      break;
    }

    ctx.boxCount += 1;
    const node = {
      type: header.type,
      offset: header.offset,
      size: header.end - header.offset,
      headerSize: header.headerSize,
      flags: [],
      children: null,
    };
    if (header.sizeField === 0) node.flags.push('size=0');
    if (header.sizeField === 1) node.flags.push('largesize');
    if (header.truncated) {
      node.flags.push('越界已截断');
      ctx.malformed = true;
      ctx.issues.push(`box ${header.type} @${header.offset} 声明长度超出父级范围，已截断；这是结构畸形，不是读取预算限制`);
    }
    nodes.push(node);

    const childPath = path.concat(header.type);
    try {
      await handleBox(reader, ctx, header, childPath);
    } catch (err) {
      ctx.issues.push(`解析 ${header.type} 失败：${err && err.message ? err.message : String(err)}`);
    }

    if (header.truncated) {
      node.flags.push('不再解析子 box');
    } else if (CONTAINER_TYPES.has(header.type)) {
      if (depth < LIMITS.maxDepth) {
        let childStart = header.payloadOffset;
        if (header.type === 'meta') {
          childStart = await metaChildrenStart(reader, header.payloadOffset, header.end);
        }
        if (childStart !== null && childStart + 8 <= header.end) {
          node.children = await walkBoxes(reader, ctx, childStart, header.end, depth + 1, childPath);
        } else {
          node.flags.push('未找到子 box');
        }
      } else {
        node.flags.push(`达到层深上限（${LIMITS.maxDepth}）`);
        ctx.truncated = true;
      }
    }

    if (header.type === 'trak') ctx.currentTrack = null;

    const next = header.end;
    if (next <= header.offset) {
      ctx.issues.push(`偏移 ${offset} 处 box 长度不前进，停止解析；这是结构畸形，不是读取预算限制`);
      ctx.malformed = true;
      break;
    }
    offset = next;
  }

  return nodes;
}

/* ------------------------------------------------------------------ */
/* 签名识别                                                            */
/* ------------------------------------------------------------------ */

function detectSignature(head, size) {
  const unknown = { id: 'unknown', label: '未识别', detail: '前 32 字节不匹配已知签名' };
  if (!head.length) return { ...unknown, detail: '文件为空或无法读取' };

  if (size >= 12 && ascii(head, 4, 4) === 'ftyp') {
    const brandOffset = be32(head, 0) === 1 ? 16 : 8; // largesize 时品牌后移 8 字节
    const brand = ascii(head, brandOffset, 4).trim();
    const compatible = [];
    for (let o = brandOffset + 8; o + 4 <= head.length; o += 4) {
      const b = ascii(head, o, 4).trim();
      if (b) compatible.push(b);
    }
    const all = [brand, ...compatible];
    if (all.some((b) => HEIF_BRANDS.has(b))) {
      return { id: 'heif', label: 'ISO BMFF / HEIF 图片（HEIC 系列）', detail: `major brand = ${brand}；兼容品牌 ${compatible.join(', ') || '（未读到）'}` };
    }
    if (all.some((b) => AVIF_BRANDS.has(b))) {
      return { id: 'avif', label: 'ISO BMFF / AVIF 图片', detail: `major brand = ${brand}；兼容品牌 ${compatible.join(', ') || '（未读到）'}` };
    }
    if (brand === 'qt') {
      return { id: 'quicktime', label: 'ISO BMFF / QuickTime (.mov)', detail: `major brand = qt` };
    }
    if (all.some((b) => MP4_BRANDS.has(b))) {
      return { id: 'mp4', label: 'ISO BMFF / MP4 家族', detail: `major brand = ${brand}；兼容品牌 ${compatible.join(', ') || '（未读到）'}` };
    }
    return { id: 'isobmff', label: 'ISO BMFF（品牌未知）', detail: `major brand = ${brand || '（空白）'}` };
  }

  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return { id: 'jpeg', label: 'JPEG', detail: 'FF D8 FF' };
  }
  if (head.length >= 8 && hex(head.subarray(0, 8)) === '89 50 4e 47 0d 0a 1a 0a') {
    return { id: 'png', label: 'PNG', detail: '89 50 4E 47 0D 0A 1A 0A' };
  }
  if (head.length >= 6 && (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a')) {
    return { id: 'gif', label: 'GIF', detail: ascii(head, 0, 6) };
  }
  if (head.length >= 12 && ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') {
    return { id: 'webp', label: 'WebP', detail: 'RIFF....WEBP' };
  }
  if (head.length >= 2 && head[0] === 0x42 && head[1] === 0x4d) {
    return { id: 'bmp', label: 'BMP', detail: 'BM' };
  }
  return unknown;
}

/* ------------------------------------------------------------------ */
/* 原始字节启发式扫描                                                  */
/* ------------------------------------------------------------------ */

function buildScanRanges(fileSize, budgetBytes) {
  if (fileSize <= budgetBytes) return [{ start: 0, end: fileSize }];
  // 大文件：看头也看尾（QuickTime 常把 moov/metadata 放在文件尾部）。
  const half = Math.floor(budgetBytes / 2);
  return [
    { start: 0, end: half },
    { start: fileSize - half, end: fileSize },
  ];
}

async function scanMarkers(reader, fileSize, limits) {
  const ranges = buildScanRanges(fileSize, limits.scanReadBytes);
  const hits = new Map(MARKER_DEFS.map((m) => [m.id, { id: m.id, label: m.label, count: 0, firstOffset: null }]));
  const uuidMap = new Map();
  let bytesScanned = 0;
  let truncated = false;

  for (const range of ranges) {
    let pos = range.start;
    let carry = new Uint8Array(0);

    while (pos < range.end) {
      const want = Math.min(LIMITS.scanChunkBytes, range.end - pos);
      const chunk = await reader.readAt(pos, want, 'scan');
      if (!chunk.length) {
        truncated = true;
        break;
      }

      const buf = new Uint8Array(carry.length + chunk.length);
      buf.set(carry, 0);
      buf.set(chunk, carry.length);
      const base = pos - carry.length;

      for (const def of MARKER_DEFS) {
        const hit = hits.get(def.id);
        let from = 0;
        let found = indexOfAscii(buf, def.codes, from);
        while (found !== -1) {
          // 只跳过完全落在 carry 内的命中，避免重复计数
          if (found + def.codes.length > carry.length) {
            if (hit.firstOffset === null) hit.firstOffset = base + found;
            if (hit.count < LIMITS.markerCountCap) hit.count += 1;
          }
          from = found + 1;
          if (from > buf.length - def.codes.length) break;
          found = indexOfAscii(buf, def.codes, from);
        }
      }

      const text = latin1(buf);
      const uuidRe = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      let m = uuidRe.exec(text);
      while (m !== null && uuidMap.size < LIMITS.maxUuidCandidates) {
        const normalized = m[0].toLowerCase();
        if (!uuidMap.has(normalized)) {
          uuidMap.set(normalized, { uuid: normalized, source: '原始字节文本匹配', offset: base + m.index });
        }
        m = uuidRe.exec(text);
      }

      bytesScanned += chunk.length;
      pos += chunk.length;

      const keep = Math.min(LIMITS.scanOverlapBytes, buf.length);
      carry = buf.slice(buf.length - keep);
    }

    if (truncated) break;
  }

  const hitList = Array.from(hits.values()).filter((h) => h.count > 0);

  return {
    budgetBytes: limits.scanReadBytes,
    totalBudgetBytes: limits.totalReadBytes,
    bytesScanned,
    ranges,
    complete: bytesScanned >= fileSize,
    truncated,
    hits: hitList,
    uuidCandidates: Array.from(uuidMap.values()),
  };
}

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */

function describeItemType(type) {
  if (type === 'grid') return 'HEIF 网格派生图（把若干 tile 拼成一张静态图）';
  if (type === 'hvc1' || type === 'hev1') return 'HEVC 编码的 HEIF 图片 item（不是视频帧）';
  if (type === 'av01') return 'AV1 编码的 HEIF 图片 item';
  if (type === 'jpeg') return 'JPEG 图片 item';
  if (type === 'Exif') return 'Exif 元数据 item';
  if (type === 'mime') return 'mime 数据 item（常见为缩略图/辅助数据）';
  if (type === 'iden') return 'identity 图片 item';
  if (type === 'iovl') return 'image overlay item';
  return 'HEIF item';
}

function summarize(result, ctx, signature, file) {
  const type = result.type;
  const imageSignature = ['jpeg', 'png', 'gif', 'webp', 'bmp', 'heif', 'avif', 'isobmff'].includes(signature.id)
    && !['quicktime', 'mp4', 'isobmff'].includes(signature.id);

  const imageItems = ctx.heifItems
    .filter((it) => IMAGE_ITEM_TYPES.has(it.itemType))
    .map((it) => ({
      itemId: it.itemId,
      itemType: it.itemType,
      name: it.name,
      description: describeItemType(it.itemType),
    }));

  const metaItems = ctx.heifItems
    .filter((it) => !IMAGE_ITEM_TYPES.has(it.itemType))
    .map((it) => ({ itemId: it.itemId, itemType: it.itemType, name: it.name, description: describeItemType(it.itemType) }));

  const roleOf = (handlers) => {
    if (handlers.includes('vide')) return 'video';
    if (handlers.includes('soun')) return 'audio';
    if (handlers.includes('meta') || handlers.includes('mdta')) return 'metadata';
    return 'other';
  };

  const tracks = ctx.tracks.map((t) => {
    const handlerTypes = uniq(t.handlerTypes);
    return {
      offset: t.offset,
      handlerTypes,
      role: roleOf(handlerTypes),
      sampleEntryTypes: uniq(t.sampleEntries.map((e) => e.type)),
    };
  });

  const videoTracks = tracks.filter((t) => t.role === 'video');
  const audioTracks = tracks.filter((t) => t.role === 'audio');
  const metadataTracks = tracks.filter((t) => t.role === 'metadata');

  const imageReasons = [];
  if (imageSignature) imageReasons.push(`文件签名：${signature.label}`);
  if (result.markers.hits.some((h) => h.id === 'exif')) imageReasons.push('原始字节中命中 Exif 标记');
  if (ctx.ftyp && ctx.ftyp.majorBrand && HEIF_BRANDS.has(ctx.ftyp.majorBrand)) imageReasons.push(`ftyp major brand 为 ${ctx.ftyp.majorBrand}`);
  if (imageItems.length) imageReasons.push(`meta/iinf 中有 ${imageItems.length} 个 HEIF 图片 item`);

  const videoReasons = [];
  if (videoTracks.length) {
    const codecs = uniq(videoTracks.flatMap((t) => t.sampleEntryTypes));
    videoReasons.push(`${videoTracks.length} 条 hdlr=vide 的轨道${codecs.length ? `（sample entry：${codecs.join(', ')}）` : ''}`);
  }

  return {
    signature,
    isoBmff: ctx.ftyp
      ? {
        ftyp: ctx.ftyp,
        brands: uniq([ctx.ftyp.majorBrand, ...ctx.ftyp.compatibleBrands]).filter(Boolean),
        kind: HEIF_BRANDS.has(ctx.ftyp.majorBrand) || ctx.ftyp.compatibleBrands.some((b) => HEIF_BRANDS.has(b))
          ? 'heif'
          : ctx.ftyp.majorBrand === 'qt'
            ? 'quicktime'
            : 'isobmff',
      }
      : null,
    heif: {
      isHeif: Boolean(ctx.ftyp && (HEIF_BRANDS.has(ctx.ftyp.majorBrand) || ctx.ftyp.compatibleBrands.some((b) => HEIF_BRANDS.has(b)))),
      imageItems,
      otherItems: metaItems,
      hasGrid: imageItems.some((it) => it.itemType === 'grid'),
      hasHvc1: imageItems.some((it) => it.itemType === 'hvc1' || it.itemType === 'hev1'),
    },
    tracks,
    otherHandlerTypes: ctx.otherHandlerTypes,
    hasVideoTrack: videoTracks.length > 0,
    hasAudioTrack: audioTracks.length > 0,
    hasMetadataTrack: metadataTracks.length > 0,
    looksLikeImage: Boolean(imageSignature || imageItems.length),
    looksLikeVideoTrack: videoTracks.length > 0,
    facts: {
      image: { likely: Boolean(imageSignature || imageItems.length), reasons: imageReasons },
      videoTrack: { present: videoTracks.length > 0, reasons: videoReasons },
    },
    declaredType: type || '（空）',
    fileTypeLooksTrustworthy: !type
      || (type.startsWith('image/') ? Boolean(imageSignature) : true),
    caveats: [
      '类型判断来自文件签名、box 结构与有限字节扫描，不等于系统或相册的判定。',
      'HEIF 中的 hvc1 / grid 是图片 item，不能当作视频帧。',
      '“没有命中 LivePhoto 标记”不代表文件不是实况照片；元数据可能不在扫描范围内，或使用其他键名。',
      'UUID 候选只是字节层面的候选，不能证明图片与视频已配对。',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 对外入口                                                            */
/* ------------------------------------------------------------------ */

/**
 * @param {File|Blob & {name?: string, lastModified?: number, webkitRelativePath?: string}} file
 * @returns {Promise<object>} 可直接 JSON 序列化的诊断结果
 */
export async function inspectFile(file) {
  const startedAt = Date.now();
  const errors = [];
  const issues = [];
  const limits = LIMITS;

  const name = typeof file?.name === 'string' ? file.name : '';
  const type = typeof file?.type === 'string' ? file.type : '';
  const size = Number.isFinite(file?.size) ? file.size : 0;
  const lastModified = Number.isFinite(file?.lastModified) ? file.lastModified : 0;

  const result = {
    inspector: INSPECTOR_VERSION,
    ok: true,
    name,
    type,
    typeIsEmpty: type === '',
    size,
    sizeHuman: formatBytes(size),
    lastModified,
    lastModifiedIso: lastModified ? new Date(lastModified).toISOString() : '',
    webkitRelativePath: typeof file?.webkitRelativePath === 'string' ? file.webkitRelativePath : '',
    head: { bytes: 0, hex: '', ascii: '' },
    signature: { id: 'unknown', label: '未识别', detail: '' },
    isoBmff: null,
    heif: { isHeif: false, imageItems: [], otherItems: [], hasGrid: false, hasHvc1: false },
    tracks: [],
    otherHandlerTypes: [],
    hasVideoTrack: false,
    hasAudioTrack: false,
    hasMetadataTrack: false,
    looksLikeImage: false,
    looksLikeVideoTrack: false,
    facts: { image: { likely: false, reasons: [] }, videoTrack: { present: false, reasons: [] } },
    markers: { hits: [], uuidCandidates: [], bytesScanned: 0, ranges: [], complete: false, truncated: false, budgetBytes: limits.scanReadBytes, totalBudgetBytes: limits.totalReadBytes },
    boxes: { tree: [], boxCount: 0, truncated: false, malformed: false, issues: [] },
    preview: {
      kind: 'none',
      status: 'not-attempted',
      width: null,
      height: null,
      durationSeconds: null,
      timeout: false,
      error: null,
      message: '结构检查阶段不创建预览；页面会尝试本地预览并更新这里。',
      updatedAt: null,
    },
    limits: { ...limits },
    errors,
    elapsedMs: 0,
  };

  if (!file || typeof file.slice !== 'function' || typeof file.arrayBuffer !== 'function') {
    result.ok = false;
    errors.push('传入的对象不是可读取的 File/Blob');
    result.elapsedMs = Date.now() - startedAt;
    return result;
  }

  try {
    const reader = createReader(file, limits);

    const headBytes = await reader.readAt(0, Math.min(limits.headBytes, size), 'structure');
    result.head = {
      bytes: headBytes.length,
      hex: hex(headBytes),
      ascii: Array.from(headBytes, (b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join(''),
    };
    result.signature = detectSignature(headBytes, size);
    if (headBytes.length < Math.min(limits.headBytes, size)) {
      issues.push('前 32 字节未能完整读取');
    }

    const ctx = {
      ftyp: null,
      heifItems: [],
      tracks: [],
      currentTrack: null,
      otherHandlerTypes: [],
      sampleEntries: [],
      uuidCandidates: [],
      boxCount: 0,
      truncated: false,
      malformed: false,
      issues,
    };

    const firstType = ascii(headBytes, 4, 4);
    const looksIso = firstType === 'ftyp'
      || ['moov', 'mdat', 'wide', 'free', 'skip', 'uuid', 'meta', 'styp', 'sidx'].includes(firstType);
    if (looksIso && size >= 16) {
      try {
        ctx.tree = await walkBoxes(reader, ctx, 0, size, 0);
        result.boxes = {
          tree: ctx.tree,
          boxCount: ctx.boxCount,
          truncated: ctx.truncated,
          malformed: ctx.malformed,
          issues: issues.slice(),
        };
      } catch (err) {
        errors.push(`box 解析失败：${err && err.message ? err.message : String(err)}`);
      }
    } else {
      result.boxes.issues.push('头部不像 ISO BMFF box 结构，跳过 box 解析（不涉及读取预算或层深限制）');
    }

    // uuid box 候选（来自结构解析）并入扫描结果
    for (const cand of ctx.uuidCandidates) {
      if (result.markers.uuidCandidates.length < limits.maxUuidCandidates) {
        result.markers.uuidCandidates.push({ ...cand, source: 'uuid box（结构）' });
      }
    }

    const scan = await scanMarkers(reader, size, limits);
    scan.uuidCandidates = scan.uuidCandidates.concat(result.markers.uuidCandidates).slice(0, limits.maxUuidCandidates);
    scan.ranges = scan.ranges.map((r) => ({ start: r.start, end: r.end, bytes: Math.max(0, r.end - r.start) }));
    result.markers = scan;
    result.markers.truncated = scan.truncated || reader.state.scanExhausted;
    if (reader.state.structureExhausted) {
      issues.push(`结构解析读取达到预算上限（${formatBytes(limits.structureReadBytes)}）`);
    }

    const summary = summarize(result, ctx, result.signature, file);
    Object.assign(result, {
      signature: summary.signature,
      isoBmff: summary.isoBmff,
      heif: summary.heif,
      tracks: summary.tracks,
      otherHandlerTypes: summary.otherHandlerTypes,
      hasVideoTrack: summary.hasVideoTrack,
      hasAudioTrack: summary.hasAudioTrack,
      hasMetadataTrack: summary.hasMetadataTrack,
      looksLikeImage: summary.looksLikeImage,
      looksLikeVideoTrack: summary.looksLikeVideoTrack,
      facts: summary.facts,
      caveats: summary.caveats,
    });

    result.boxes.issues = issues.slice();
    if (!scan.complete) {
      result.markers.notes = [
        `只扫描了前/后有限字节：${scan.ranges.map((r) => `${r.start}–${r.end}`).join('、')}，共 ${formatBytes(scan.bytesScanned)} / 文件 ${formatBytes(size)}。`,
        '扫描范围之外的标记不会被发现；这是启发式，不是完整解析。',
      ];
    } else {
      result.markers.notes = [
        `扫描了完整文件（${formatBytes(scan.bytesScanned)}）。仍是原始字节启发式，不是完整元数据解析。`,
      ];
    }
    result.markers.notes.push('UUID 候选只说明字节中出现过类似 UUID 的内容，不代表图片与视频配对已证实。');
  } catch (err) {
    result.ok = false;
    errors.push(`检查过程出错：${err && err.message ? err.message : String(err)}`);
  }

  result.errors = errors;
  result.elapsedMs = Date.now() - startedAt;
  return result;
}
