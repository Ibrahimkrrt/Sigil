import { YearMonth } from '../models/year-month';

/** Parse "2021", "2021-03" or "2021-03-15". */
export function parseDate(value: unknown): YearMonth | null {
  const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(String(value ?? '').trim());
  if (!match) return null;
  return { y: +match[1], m: match[2] ? Math.min(12, Math.max(1, +match[2])) : null };
}
