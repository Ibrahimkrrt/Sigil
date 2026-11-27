import { crc32 } from './crc32';
import { ZipFile } from './zip-file';

/**
 * Writes a zip archive with the files stored as they are, without compression.
 * Enough to package a web CV or a source tree without a dependency; runs in browsers and in Node.
 */
export function zipStore(files: readonly ZipFile[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const entries = files.map((file) => {
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    return { name: encoder.encode(file.name.replace(/^\/+/, '')), data, crc: crc32(data), offset: 0 };
  });
  const size = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length + 46 + entry.name.length, 22);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  // A fixed date keeps two exports of the same content byte-identical.
  const time = 0;
  const date = ((2026 - 1980) << 9) | (1 << 5) | 1;
  let at = 0;
  for (const entry of entries) {
    entry.offset = at;
    view.setUint32(at, 0x04034b50, true); view.setUint16(at + 4, 20, true); view.setUint16(at + 6, 0x0800, true); view.setUint16(at + 8, 0, true);
    view.setUint16(at + 10, time, true); view.setUint16(at + 12, date, true); view.setUint32(at + 14, entry.crc, true);
    view.setUint32(at + 18, entry.data.length, true); view.setUint32(at + 22, entry.data.length, true);
    view.setUint16(at + 26, entry.name.length, true); view.setUint16(at + 28, 0, true);
    out.set(entry.name, at + 30); out.set(entry.data, at + 30 + entry.name.length);
    at += 30 + entry.name.length + entry.data.length;
  }
  const directory = at;
  for (const entry of entries) {
    view.setUint32(at, 0x02014b50, true); view.setUint16(at + 4, 20, true); view.setUint16(at + 6, 20, true); view.setUint16(at + 8, 0x0800, true); view.setUint16(at + 10, 0, true);
    view.setUint16(at + 12, time, true); view.setUint16(at + 14, date, true); view.setUint32(at + 16, entry.crc, true);
    view.setUint32(at + 20, entry.data.length, true); view.setUint32(at + 24, entry.data.length, true); view.setUint16(at + 28, entry.name.length, true);
    view.setUint32(at + 42, entry.offset, true);
    out.set(entry.name, at + 46);
    at += 46 + entry.name.length;
  }
  view.setUint32(at, 0x06054b50, true); view.setUint16(at + 8, entries.length, true); view.setUint16(at + 10, entries.length, true);
  view.setUint32(at + 12, at - directory, true); view.setUint32(at + 16, directory, true);
  return out;
}
