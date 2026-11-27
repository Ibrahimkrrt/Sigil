/** The bytes a data: URL carries, or null when the text is not a data: URL. */
export function dataUrlToBytes(url: string): Uint8Array | null {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(url);
  if (!match) return null;
  if (!match[2]) return new TextEncoder().encode(decodeURIComponent(match[3]));
  const binary = atob(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
