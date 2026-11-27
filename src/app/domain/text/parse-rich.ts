import { RichToken } from '../models/rich-token';
import { safeUrl } from './safe-url';

/**
 * Minimal rich text: **bold**, *emphasis*, [label](url) and line breaks.
 * Content is only ever split into tokens, never parsed as HTML. A link whose URL
 * is not safe is kept as its label.
 */
export function parseRich(value: unknown): RichToken[] {
  const source = String(value ?? '');
  const tokens: RichToken[] = [];
  let last = 0;
  for (const match of source.matchAll(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\)|\n)/g)) {
    const found = match[0];
    const at = match.index ?? 0;
    if (at > last) tokens.push({ kind: 'text', text: source.slice(last, at) });
    if (found === '\n') tokens.push({ kind: 'break' });
    else if (found.startsWith('**')) tokens.push({ kind: 'strong', text: found.slice(2, -2) });
    else if (found.startsWith('*')) tokens.push({ kind: 'em', text: found.slice(1, -1) });
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(found);
      const url = link ? safeUrl(link[2]) : null;
      if (link && url) tokens.push({ kind: 'link', text: link[1], url });
      else tokens.push({ kind: 'text', text: link ? link[1] : found });
    }
    last = at + found.length;
  }
  if (last < source.length) tokens.push({ kind: 'text', text: source.slice(last) });
  return tokens;
}
