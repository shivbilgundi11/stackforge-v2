/**
 * A minimal, store-only ZIP writer.
 *
 * The MCP builder emits a six-file bundle, and pasting six files one at a time
 * is a worse experience than one download — the zip is the artifact that makes
 * the tool worth returning to.
 *
 * Store-only (no DEFLATE) is deliberate. The alternative was a compression
 * dependency for a payload that is a few kilobytes of source; every OS unzips
 * a stored archive natively, and the whole format fits in this file where it
 * can be read and tested. Compression would save nothing a user would notice.
 *
 * Everything here writes little-endian, which is what the format specifies.
 */

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

/** Bit 11 — filenames and comments are UTF-8 rather than CP437. */
const UTF8_FLAG = 0x0800;

const CRC_TABLE = /* @__PURE__ */ (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (CRC_TABLE[(crc ^ bytes[index]!) & 0xff]! ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * MS-DOS date and time, which is what the format stores.
 *
 * Two seconds of resolution and a 1980 epoch. Anything before 1980 is clamped
 * rather than allowed to wrap into a negative year, which some tools display
 * as a corrupt entry.
 */
function dosStamp(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
    date: (((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
  };
}

export type ZipEntry = { name: string; content: string };

/**
 * Build a ZIP archive from text files.
 *
 * `modified` is injectable so a test can assert byte-for-byte output; it
 * defaults to now, which is what a real download wants.
 */
export function zipSync(entries: ZipEntry[], modified: Date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const stamp = dosStamp(modified);

  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const checksum = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_HEADER, true);
    localView.setUint16(4, 20, true); // version needed: 2.0
    localView.setUint16(6, UTF8_FLAG, true);
    localView.setUint16(8, 0, true); // method: stored
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true); // compressed
    localView.setUint32(22, data.length, true); // uncompressed
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);

    parts.push(local, data);

    const entryHeader = new Uint8Array(46 + nameBytes.length);
    const entryView = new DataView(entryHeader.buffer);
    entryView.setUint32(0, CENTRAL_HEADER, true);
    entryView.setUint16(4, 20, true); // version made by
    entryView.setUint16(6, 20, true); // version needed
    entryView.setUint16(8, UTF8_FLAG, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint16(12, stamp.time, true);
    entryView.setUint16(14, stamp.date, true);
    entryView.setUint32(16, checksum, true);
    entryView.setUint32(20, data.length, true);
    entryView.setUint32(24, data.length, true);
    entryView.setUint16(28, nameBytes.length, true);
    entryView.setUint16(30, 0, true); // extra
    entryView.setUint16(32, 0, true); // comment
    entryView.setUint16(34, 0, true); // disk number
    entryView.setUint16(36, 0, true); // internal attributes
    entryView.setUint32(38, 0, true); // external attributes
    entryView.setUint32(42, offset, true);
    entryHeader.set(nameBytes, 46);
    central.push(entryHeader);

    offset += local.length + data.length;
  }

  const centralSize = central.reduce((total, chunk) => total + chunk.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, END_OF_CENTRAL, true);
  endView.setUint16(4, 0, true); // this disk
  endView.setUint16(6, 0, true); // disk with central directory
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true); // comment length

  const chunks = [...parts, ...central, end];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const archive = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  return archive;
}

/** Build the archive and hand the browser a download. */
export function downloadZip(filename: string, entries: ZipEntry[]): void {
  const archive = zipSync(entries);
  const blob = new Blob([archive as unknown as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
