/* A small, dependency-free ZIP writer. Images are already compressed: STORE preserves originals. */
(() => {
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function createZip(files) {
    const entries = [], directory = [];
    let offset = 0, directorySize = 0;
    for (const { name, bytes } of files) {
      const filename = new TextEncoder().encode(name);
      if (filename.length > 65535 || bytes.length > 0xffffffff) throw new Error('文件超出 ZIP 支持的大小');
      const crc = crc32(bytes);
      const local = new Uint8Array(30 + filename.length);
      const head = new DataView(local.buffer);
      head.setUint32(0, 0x04034b50, true);
      head.setUint16(4, 20, true);
      head.setUint16(6, 0x0800, true); // UTF-8 filenames, including Chinese and emoji.
      head.setUint16(12, 33, true); // 1980-01-01; deterministic output.
      head.setUint32(14, crc, true);
      head.setUint32(18, bytes.length, true);
      head.setUint32(22, bytes.length, true);
      head.setUint16(26, filename.length, true);
      local.set(filename, 30);
      entries.push(local, bytes);
      const central = new Uint8Array(46 + filename.length);
      const record = new DataView(central.buffer);
      record.setUint32(0, 0x02014b50, true);
      record.setUint16(4, 20, true);
      record.setUint16(6, 20, true);
      record.setUint16(8, 0x0800, true);
      record.setUint16(14, 33, true);
      record.setUint32(16, crc, true);
      record.setUint32(20, bytes.length, true);
      record.setUint32(24, bytes.length, true);
      record.setUint16(28, filename.length, true);
      record.setUint32(42, offset, true);
      central.set(filename, 46);
      directory.push(central);
      directorySize += central.length;
      offset += local.length + bytes.length;
    }
    if (files.length > 65535 || offset + directorySize > 0xffffffff) throw new Error('分类太大，无法在浏览器中打包');
    const end = new Uint8Array(22);
    const record = new DataView(end.buffer);
    record.setUint32(0, 0x06054b50, true);
    record.setUint16(8, files.length, true);
    record.setUint16(10, files.length, true);
    record.setUint32(12, directorySize, true);
    record.setUint32(16, offset, true);
    return new Blob([...entries, ...directory, end], { type: 'application/zip' });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createZip };
  else window.BQBZip = { createZip };
})();
