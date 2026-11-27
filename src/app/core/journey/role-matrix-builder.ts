import { Injectable, inject } from '@angular/core';
import { CvEngagement } from '@domain/models/cv-engagement';
import { CvExperience } from '@domain/models/cv-experience';
import { CvPosition } from '@domain/models/cv-position';
import { parseDate } from '@domain/text/parse-date';
import { DateFormatter } from '../format/date-formatter';
import { Translator } from '../i18n/translator';
import { MatrixBar } from './matrix-bar';
import { MatrixRow } from './matrix-row';
import { RoleMatrix } from './role-matrix';
import { TimeSpan } from './time-span';

/** Lays out roles over the years: one lane per role, one bar per company it was held at. */
@Injectable({ providedIn: 'root' })
export class RoleMatrixBuilder {
  private readonly dates = inject(DateFormatter);
  private readonly translator = inject(Translator);

  build(roles: readonly CvPosition[], experience: readonly CvExperience[]): RoleMatrix | null {
    const spans = roles.flatMap((role) => role.engagements.map((engagement) => this.span(engagement))).filter((span): span is TimeSpan => span !== null);
    if (!spans.length) return null;
    const min = Math.floor(Math.min(...spans.map((span) => span[0])));
    const max = Math.ceil(Math.max(...spans.map((span) => span[1])));
    const place = (span: TimeSpan): { left: string; width: string } => ({
      left: `${((span[0] - min) / (max - min)) * 100}%`,
      width: `${((span[1] - span[0]) / (max - min)) * 100}%`,
    });

    // Fill styles follow the order of the experience list, so the first (usually current) company gets the ink.
    const present = new Set(roles.flatMap((role) => role.engagements.map((engagement) => engagement.name)));
    const companies = [...new Set([...experience.map((entry) => entry.company || entry.role), ...present])].filter((name) => present.has(name));

    const lane = (role: CvPosition, partId: string | null): MatrixRow => {
      // Bars that overlap in time (two places at once in the same role) are stacked, never drawn over each other.
      const ends: number[] = [];
      const bars = role.engagements
        .filter((engagement) => !partId || engagement.parts.some((part) => part.id === partId))
        .map((engagement) => ({ engagement, span: this.span(engagement) }))
        .filter((bar): bar is { engagement: CvEngagement; span: TimeSpan } => bar.span !== null)
        .sort((a, b) => a.span[0] - b.span[0])
        .map(({ engagement, span }): MatrixBar => {
          let row = ends.findIndex((end) => end <= span[0] + 0.01);
          if (row < 0) row = ends.length;
          ends[row] = span[1];
          const own = partId ? (engagement.parts.find((part) => part.id === partId)?.count ?? 1) : 0;
          return {
            name: engagement.name,
            title: `${engagement.name}, ${this.period(engagement)}`,
            ...place(span), row,
            fill: companies.indexOf(engagement.name) % 6,
            weight: partId ? (own / Math.max(1, ...engagement.parts.map((part) => part.count))).toFixed(2) : null,
          };
        });
      const partName = partId ? (role.parts.find((part) => part.id === partId)?.name ?? '') : '';
      return { name: partId ? partName : role.name, part: partId !== null, depth: Math.max(1, ends.length), bars };
    };

    const employers = this.employers(experience);
    return {
      years: Array.from({ length: max - min }, (_, i) => min + i),
      employers: employers.map((employer): MatrixBar => ({ name: employer.name, title: employer.name, ...place(employer.span), row: 0, fill: 0, weight: null })),
      // A role made of parts shows where each part was exercised, on its own thin lane.
      rows: roles.flatMap((role) => [lane(role, null), ...role.parts.filter((part) => part.count > 0).map((part) => lane(role, part.id))]),
      companies,
      description: this.describe(roles, employers),
    };
  }

  /**
   * Who the employer was over time. Only when some work was delivered to a client through
   * an employer, so the lanes can name the client while this one keeps the contract straight.
   */
  private employers(experience: readonly CvExperience[]): { name: string; span: TimeSpan }[] {
    if (!experience.some((entry) => entry.employer)) return [];
    const employers: { name: string; span: TimeSpan }[] = [];
    for (const entry of experience) {
      const span = this.span(entry);
      if (!span) continue;
      const name = entry.employer || entry.company || entry.role;
      const known = employers.find((employer) => employer.name === name);
      if (known) known.span = [Math.min(known.span[0], span[0]), Math.max(known.span[1], span[1])];
      else employers.push({ name, span });
    }
    return employers;
  }

  private describe(roles: readonly CvPosition[], employers: readonly { name: string; span: TimeSpan }[]): string {
    const to = this.translator.t(' to ');
    const employerText = employers.length
      ? `${this.translator.t('Employer')}: ${[...employers].sort((a, b) => a.span[0] - b.span[0]).map((employer) => `${employer.name} ${Math.floor(employer.span[0])} ${to} ${Math.ceil(employer.span[1]) - 1}`).join(', ')}. `
      : '';
    const roleText = roles
      .map((role) => `${role.name}: ${role.engagements.map((engagement) => {
        const parts = engagement.parts.length ? ` (${engagement.parts.map((part) => part.name).join(', ')})` : '';
        return `${engagement.name} ${this.period(engagement)}${parts}`;
      }).join(', ')}`)
      .join('. ');
    return employerText + roleText;
  }

  private period(item: { start: string; end: string; current: boolean }): string {
    return this.dates.range(item.start, item.current ? '' : item.end);
  }

  /** A period as fractional years, at least half a year long. Null without a start date. */
  private span(item: { start: string; end: string; current: boolean }): TimeSpan | null {
    const from = parseDate(item.start);
    if (!from) return null;
    const now = new Date();
    const to = item.current ? { y: now.getFullYear(), m: now.getMonth() + 1 } : (parseDate(item.end) ?? from);
    const start = from.y + ((from.m ?? 1) - 1) / 12;
    let end = to.y + (to.m ? to.m / 12 : 0);
    if (!to.m && !item.current && to.y === from.y) end = from.y + 1;
    if (end - start < 0.5) end = start + 0.5;
    return [start, end];
  }
}
