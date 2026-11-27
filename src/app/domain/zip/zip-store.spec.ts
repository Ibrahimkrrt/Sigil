import { dataUrlToBytes } from './data-url-to-bytes';
import { crc32 } from './crc32';
import { zipStore } from './zip-store';

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('stores files with a central directory that lists every one', () => {
    const archive = zipStore([{ name: '/index.html', data: '<p>é</p>' }, { name: 'assets/a.bin', data: new Uint8Array([1, 2, 3]) }]);
    const view = new DataView(archive.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const end = archive.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const text = new TextDecoder().decode(archive);
    expect(text).toContain('index.html');
    expect(text).not.toContain('/index.html');
    expect(text).toContain('assets/a.bin');
  });

  it('writes the same bytes for the same content', () => {
    const files = [{ name: 'cv.json', data: '{}' }];
    expect(zipStore(files)).toEqual(zipStore(files));
  });

  it('reads both kinds of data URL', () => {
    expect(Array.from(dataUrlToBytes('data:text/plain;base64,QUI=') ?? [])).toEqual([65, 66]);
    expect(new TextDecoder().decode(dataUrlToBytes('data:image/svg+xml,%3Csvg%2F%3E') ?? undefined)).toBe('<svg/>');
    expect(dataUrlToBytes('assets/portrait.jpg')).toBeNull();
  });
});
