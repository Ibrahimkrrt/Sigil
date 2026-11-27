/** Every text value anywhere inside a JSON value, in document order. */
export function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, found);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectStrings(item, found);
  return found;
}
