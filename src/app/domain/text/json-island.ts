/** JSON that is safe to place inside a script element: nothing in it can close the element early. */
export function jsonIsland(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
