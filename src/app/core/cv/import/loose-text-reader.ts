import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';
import { FieldPicker } from './field-picker';

/** Reads text, lists of lines, names, places and levels however a CV file wrote them. */
@Injectable({ providedIn: 'root' })
export class LooseTextReader {
  private readonly picker = inject(FieldPicker);
  private readonly levelWords: Readonly<Record<string, number>> = {
    beginner: 30, basic: 30, novice: 30, intermediate: 55, advanced: 80, proficient: 80, expert: 95, master: 95,
  };

  str(value: unknown): string {
    return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
  }

  /** The value as a list. A single value becomes a list of one; nothing becomes an empty list. */
  list(value: unknown): unknown[] {
    return Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  }

  /** The value as a list of JSON objects, ignoring anything else in it. */
  records(value: unknown): LooseRecord[] {
    return this.list(value).filter(isRecord);
  }

  /** Bullet points, from a list of strings or objects, or from one text with line breaks. */
  lines(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => (isRecord(item) ? this.str(this.picker.pick(item, 'text', 'description', 'summary', 'name', 'title')) : this.str(item)))
        .filter(Boolean);
    }
    return this.str(value)
      .split(/\n\s*(?:[-•*·]\s+)|\n{2,}/)
      .map((line) => line.replace(/^[-•*·]\s+/, '').trim())
      .filter(Boolean);
  }

  /** Names, from a list of strings or objects, or from one comma-separated text. */
  names(value: unknown): string[] {
    return this.list(value)
      .flatMap((item) => (isRecord(item)
        ? [this.str(this.picker.pick(item, 'name', 'title', 'label', 'skill', 'language', 'keyword'))]
        : this.str(item).split(/\s*[,;|]\s*/)))
      .filter(Boolean);
  }

  paragraphs(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => this.str(item)).filter(Boolean);
    return this.str(value)
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
  }

  /** A place as "City, Region, Country", from text or from an address object. */
  place(value: unknown): string {
    if (!isRecord(value)) return this.str(value);
    const parts = [
      this.picker.pick(value, 'city', 'town'),
      this.picker.pick(value, 'region', 'state', 'province'),
      this.picker.pick(value, 'country', 'countrycode'),
    ].map((part) => this.str(part)).filter(Boolean);
    return parts.join(', ') || this.str(this.picker.pick(value, 'address', 'name'));
  }

  /** A skill level from 0 to 100, from a score out of 5, out of 10, a percentage or a word. */
  level(value: unknown): number | undefined {
    if (typeof value === 'number') return value <= 5 ? value * 20 : value <= 10 ? value * 10 : Math.min(100, value);
    const word = this.str(value).toLowerCase();
    return this.levelWords[word] ?? (/^\d+%?$/.test(word) ? Math.min(100, parseInt(word, 10)) : undefined);
  }

  /** The record without its empty fields (empty text, empty lists, empty objects). */
  clean<T extends LooseRecord>(record: T): T {
    for (const key of Object.keys(record)) {
      const value = record[key];
      const empty = value == null || value === '' || (Array.isArray(value) && !value.length) || (isRecord(value) && !Object.keys(value).length);
      if (empty) delete record[key];
    }
    return record;
  }
}
