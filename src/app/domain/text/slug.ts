/** A lower-case, hyphenated identifier made from any text. */
export function slug(value: unknown, fallback = 'item'): string {
  const out = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || fallback;
}
