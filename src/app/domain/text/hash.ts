/** Deterministic 32-bit hash (FNV-1a) of a string. */
export function hash(value: string): number {
  let x = 2166136261;
  for (const char of value) x = Math.imul(x ^ (char.codePointAt(0) ?? 0), 16777619);
  return x >>> 0;
}
