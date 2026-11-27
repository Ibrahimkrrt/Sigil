import { Injectable, inject } from '@angular/core';
import { parseDate } from '@domain/text/parse-date';
import { Translator } from '../i18n/translator';

/** Dates and periods as the reader's language writes them. */
@Injectable({ providedIn: 'root' })
export class DateFormatter {
  private readonly translator = inject(Translator);
  private readonly englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** "2021-03" as "Mar 2021", or as "2021" when `month` is false or unknown. Unparsed text is returned as it is. */
  date(value: string, month = true): string {
    const parsed = parseDate(value);
    if (!parsed) return value ?? '';
    if (!(month && parsed.m)) return String(parsed.y);
    return `${this.monthName(parsed.m)} ${parsed.y}`;
  }

  /** "2019 to 2022". An open period ends with `present`, which defaults to "today". */
  range(start: string, end: string, month = false, present = this.translator.t('today')): string {
    const from = start ? this.date(start, month) : '';
    const to = end ? this.date(end, month) : present;
    if (!from) return end ? to : '';
    return from === to ? from : `${from}${this.translator.t(' to ')}${to}`;
  }

  /** Length of a period in years (fractional). Open periods run to `now`. */
  spanYears(start: string, end: string, now = new Date()): number {
    const from = parseDate(start);
    if (!from) return 0;
    const to = parseDate(end) ?? { y: now.getFullYear(), m: now.getMonth() + 1 };
    return Math.max(0.1, to.y + ((to.m ?? 12) - 1) / 12 - (from.y + ((from.m ?? 1) - 1) / 12));
  }

  private monthName(month: number): string {
    const lang = this.translator.lang();
    if (lang === 'en') return this.englishMonths[month - 1];
    try {
      return new Intl.DateTimeFormat(lang, { month: 'short' }).format(new Date(2000, month - 1, 1));
    } catch {
      return this.englishMonths[month - 1];
    }
  }
}
