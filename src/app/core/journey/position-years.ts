import { Injectable } from '@angular/core';
import { CvPosition } from '@domain/models/cv-position';
import { parseDate } from '@domain/text/parse-date';
import { TimeSpan } from './time-span';

/** Counts the years a role was held: the union of its periods, so overlapping companies are not counted twice. */
@Injectable({ providedIn: 'root' })
export class PositionYears {
  count(position: CvPosition): number {
    const now = new Date();
    const spans = position.engagements
      .map((engagement): TimeSpan | null => {
        const from = this.fraction(engagement.start, false);
        if (from == null) return null;
        const to = engagement.current ? now.getFullYear() + (now.getMonth() + 1) / 12 : (this.fraction(engagement.end, true) ?? from);
        return [from, to > from ? to : from + 1];
      })
      .filter((span): span is TimeSpan => span !== null)
      .sort((a, b) => a[0] - b[0]);
    let total = 0;
    let edge = -Infinity;
    for (const [from, to] of spans) {
      if (to <= edge) continue;
      total += to - Math.max(from, edge);
      edge = to;
    }
    return Math.max(1, Math.floor(total + 0.05));
  }

  private fraction(date: string, end: boolean): number | null {
    const parsed = parseDate(date);
    if (!parsed) return null;
    return parsed.y + (parsed.m ? (parsed.m - (end ? 0 : 1)) / 12 : 0);
  }
}
