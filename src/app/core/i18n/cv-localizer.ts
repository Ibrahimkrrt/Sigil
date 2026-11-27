import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';
import { CvLanguages } from './cv-languages';
import { Translator } from './translator';

/**
 * Content translation. A CV may carry `translations: { fr: {...} }`: each entry is an
 * overlay with the same shape as the CV, so only translated fields are repeated.
 */
@Injectable({ providedIn: 'root' })
export class CvLocalizer {
  private readonly translator = inject(Translator);

  /** The CV's own language, its translations, and the interface languages. */
  languagesOf(raw: unknown): CvLanguages {
    const meta = isRecord(raw) && isRecord(raw['meta']) ? raw['meta'] : {};
    const base = typeof meta['lang'] === 'string' && meta['lang'] ? meta['lang'] : 'en';
    const translations = isRecord(raw) && isRecord(raw['translations']) ? raw['translations'] : {};
    const content = Object.keys(translations).filter((code) => isRecord(translations[code]));
    return { base, all: [...new Set([base, ...content, ...this.translator.languages])] };
  }

  /** The CV content for one language: the base content with that language's overlay applied. */
  localize(raw: LooseRecord, code: string): LooseRecord {
    const { base } = this.languagesOf(raw);
    const over = isRecord(raw['translations']) ? raw['translations'][code] : null;
    if (code === base || !isRecord(over)) return raw;
    const { translations: _dropped, ...rest } = raw;
    const out = this.overlay(rest, over) as LooseRecord;
    out['meta'] = { ...(isRecord(out['meta']) ? out['meta'] : {}), lang: code };
    return out;
  }

  private overlay(base: unknown, over: unknown): unknown {
    if (Array.isArray(base) && Array.isArray(over)) {
      // Lists merge item by item, so a translation only repeats the fields it changes.
      const merged = base.map((item, i) => (i < over.length && over[i] != null ? this.overlay(item, over[i]) : item));
      return merged.concat(over.slice(base.length));
    }
    if (isRecord(base) && isRecord(over)) {
      const out: LooseRecord = { ...base };
      for (const [key, value] of Object.entries(over)) out[key] = key in base ? this.overlay(base[key], value) : value;
      return out;
    }
    // A translated line laid over a tagged item ({ text, roles }) replaces only its text.
    if (isRecord(base) && typeof base['text'] === 'string' && typeof over === 'string') return { ...base, text: over };
    return over;
  }
}
