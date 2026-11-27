/** Allow only web, mail, phone and relative URLs; images may also be data: or blob:. */
export function safeUrl(value: unknown, image = false): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^(mailto:|tel:)/i.test(url)) return image ? null : url;
  if (image && /^(data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]|blob:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return null;
  return url;
}
