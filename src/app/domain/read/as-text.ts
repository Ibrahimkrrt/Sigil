/** The value as trimmed text. Finite numbers are written out; anything else gives the fallback. */
export function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback;
}
