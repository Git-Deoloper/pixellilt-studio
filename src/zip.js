/** Browser/Node portable ZIP writer. Stored entries (no recompression of image data).
 * No third-party dependency and no unsafe external ZIP processing. ZIP32 limits apply.
 */
const encoder = new TextEncoder();
const MAX_UINT32 = 0xffffffff;
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
export function crc32(input) {
  let crc = 0xffffffff;
  for (const byte of input) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function safeEntryName(rawName) {
  const name = String(rawName || 'image').replace(/\\/g,'/').split('/').pop().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200);
  if (!name || name === '.' || name === '..') throw new RangeError('Unsafe file name');
  return name;
}
function dosTimestamp(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1), date: ((year - 1980) << 9) | ((date.getMonth()+1) << 5) | date.getDate() };
}
/** @param {{name:string, bytes:Uint8Array}[]} entries */
export function buildZip(entries) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 100) throw new RangeError('Invalid ZIP entry count');
  const seen = new Set();
  const files = entries.map(item => {
    if (!(item.bytes instanceof Uint8Array)) throw new TypeError('Expected Uint8Array');
    const name = safeEntryName(item.name);
    if (seen.has(name.toLowerCase())) throw new RangeError('Duplicate file name');
    seen.add(name.toLowerCase());
    const nameBytes = encoder.encode(name);
    if (nameBytes.length > 0xffff || item.bytes.length > MAX_UINT32) throw new RangeError('ZIP32 limit exceeded');
    return {nameBytes, bytes:item.bytes, crc:crc32(item.bytes)};
  });
  const localSize = files.reduce((sum,f) => sum + 30 + f.nameBytes.length + f.bytes.length, 0);
  const directorySize = files.reduce((sum,f) => sum + 46 + f.nameBytes.length, 0);
  if (localSize + directorySize + 22 > MAX_UINT32) throw new RangeError('ZIP32 limit exceeded');
  const output = new Uint8Array(localSize + directorySize + 22);
  const dv = view(output);
  const stamp = dosTimestamp(new Date());
  let offset = 0;
  const directory = [];
  for (const f of files) {
    const localOffset = offset;
    dv.setUint32(offset, 0x04034b50, true); offset += 4;
    dv.setUint16(offset, 20, true); offset += 2;
    dv.setUint16(offset, 0x0800, true); offset += 2; // UTF-8
    dv.setUint16(offset, 0, true); offset += 2; // store
    dv.setUint16(offset, stamp.time, true); offset += 2;
    dv.setUint16(offset, stamp.date, true); offset += 2;
    dv.setUint32(offset, f.crc, true); offset += 4;
    dv.setUint32(offset, f.bytes.length, true); offset += 4;
    dv.setUint32(offset, f.bytes.length, true); offset += 4;
    dv.setUint16(offset, f.nameBytes.length, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    output.set(f.nameBytes, offset); offset += f.nameBytes.length;
    output.set(f.bytes, offset); offset += f.bytes.length;
    directory.push({...f, localOffset});
  }
  const directoryOffset = offset;
  for (const f of directory) {
    dv.setUint32(offset, 0x02014b50, true); offset += 4;
    dv.setUint16(offset, 20, true); offset += 2;
    dv.setUint16(offset, 20, true); offset += 2;
    dv.setUint16(offset, 0x0800, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, stamp.time, true); offset += 2;
    dv.setUint16(offset, stamp.date, true); offset += 2;
    dv.setUint32(offset, f.crc, true); offset += 4;
    dv.setUint32(offset, f.bytes.length, true); offset += 4;
    dv.setUint32(offset, f.bytes.length, true); offset += 4;
    dv.setUint16(offset, f.nameBytes.length, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint16(offset, 0, true); offset += 2;
    dv.setUint32(offset, 0, true); offset += 4;
    dv.setUint32(offset, f.localOffset, true); offset += 4;
    output.set(f.nameBytes, offset); offset += f.nameBytes.length;
  }
  const actualDirectorySize = offset - directoryOffset;
  dv.setUint32(offset, 0x06054b50, true); offset += 4;
  dv.setUint16(offset, 0, true); offset += 2;
  dv.setUint16(offset, 0, true); offset += 2;
  dv.setUint16(offset, files.length, true); offset += 2;
  dv.setUint16(offset, files.length, true); offset += 2;
  dv.setUint32(offset, actualDirectorySize, true); offset += 4;
  dv.setUint32(offset, directoryOffset, true); offset += 4;
  dv.setUint16(offset, 0, true); offset += 2;
  return output;
}
