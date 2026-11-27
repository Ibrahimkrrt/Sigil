/**
 * Write a value at a dotted path inside a JSON object, creating the objects and lists on
 * the way. An empty value removes the key; inside a list it leaves a gap instead, so the
 * items after it keep their place.
 */
export function setAtPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = root;
  keys.slice(0, -1).forEach((key, i) => {
    const next = current[key];
    if (next === null || typeof next !== 'object') current[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    current = current[key] as Record<string, unknown>;
  });
  const last = keys[keys.length - 1];
  if (value === '' || value == null) {
    if (Array.isArray(current)) (current as unknown[])[+last] = null;
    else delete current[last];
  } else {
    current[last] = value;
  }
}
