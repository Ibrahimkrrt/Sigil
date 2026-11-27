/** Strip the rich-text markers (**bold**, *emphasis*, [label](url)) for plain-text targets. */
export function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, '$1');
}
