import { Injectable, inject } from '@angular/core';
import { isRecord } from '@domain/read/is-record';
import { FieldPicker } from './field-picker';
import { LoosePeriod } from './loose-period';
import { LooseTextReader } from './loose-text-reader';
import { MONTH_NUMBERS } from './month-numbers';

/** Reads dates and periods however a CV file wrote them. */
@Injectable({ providedIn: 'root' })
export class LooseDateReader {
  private readonly picker = inject(FieldPicker);
  private readonly text = inject(LooseTextReader);
  private readonly now = /^(present|current|currently|now|today|ongoing|aujourd'?hui|en cours|actuel|à ce jour|a ce jour|-|–|—)?$/i;

  /** Any reasonable date ("2021-03-01", "03/2021", "March 2021", { year, month }) as YYYY or YYYY-MM. Empty when it means "now". */
  date(value: unknown): string {
    if (isRecord(value)) {
      const year = this.text.str(this.picker.pick(value, 'year', 'y'));
      const month = this.text.str(this.picker.pick(value, 'month', 'm'));
      if (!/^\d{4}$/.test(year)) return '';
      return /^\d{1,2}$/.test(month) ? `${year}-${month.padStart(2, '0')}` : year;
    }
    const s = this.text.str(value);
    if (!s || this.now.test(s)) return '';
    let m = /^(\d{4})(?:[-/.](\d{1,2}))?/.exec(s);
    if (m) return m[2] ? `${m[1]}-${m[2].padStart(2, '0')}` : m[1];
    m = /^(\d{1,2})[-/.](\d{4})$/.exec(s) ?? /^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
    m = /([a-zû.éèê]+)\.?\s+(\d{4})/i.exec(s);
    if (m) {
      const month = MONTH_NUMBERS[m[1].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')];
      return month ? `${m[2]}-${String(month).padStart(2, '0')}` : m[2];
    }
    m = /(\d{4})/.exec(s);
    return m ? m[1] : '';
  }

  /** The year of any reasonable date, or an empty string. */
  year(value: unknown): string {
    return this.date(value).slice(0, 4);
  }

  /** Start and end of an entry that may hold two fields or one "2019 – 2022" string. */
  period(entry: unknown): LoosePeriod {
    let start = this.picker.pick(entry, 'start', 'startdate', 'from', 'begin', 'datefrom', 'started');
    let end = this.picker.pick(entry, 'end', 'enddate', 'to', 'until', 'dateto', 'ended');
    const single = this.text.str(this.picker.pick(entry, 'dates', 'date', 'period', 'duration', 'years', 'time', 'when'));
    if (start == null && single) {
      const parts = single.split(/\s+(?:-|–|—|to|until|au|à)\s+|\s*[–—]\s*|(?<=\d)\s*-\s*(?=[A-Za-z]|\d{4})/);
      start = parts[0];
      end = parts.length > 1 ? parts[1] : start;
    }
    const endText = this.text.str(end);
    const current = this.picker.pick(entry, 'current', 'iscurrent', 'present', 'ongoing') === true
      || (end != null && this.now.test(endText) && endText !== '')
      || (start != null && end == null && !single);
    const out: LoosePeriod = { start: this.date(start) };
    const endDate = this.date(end);
    if (current && !endDate) out.current = true;
    else if (endDate) out.end = endDate;
    return out;
  }
}
