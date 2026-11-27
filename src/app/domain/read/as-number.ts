/** The value as a finite number, read from a number or a numeric string. */
export function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(+value)) return +value;
  return fallback;
}
