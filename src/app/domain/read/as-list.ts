/** The value as a list without empty items. A single value becomes a list of one. */
export function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.filter((item) => item != null && item !== '');
  return value == null || value === '' ? [] : [value];
}
