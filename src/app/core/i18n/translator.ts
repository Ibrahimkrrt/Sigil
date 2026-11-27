import { Injectable, signal } from '@angular/core';
import { FR_MESSAGES } from './fr-messages';
import { NUMBER_WORDS } from './number-words';

/**
 * Interface strings. English is the source: `t('Download CV')` returns the string
 * for the current language, or the English when the language has none.
 */
@Injectable({ providedIn: 'root' })
export class Translator {
  private readonly dictionaries = new Map<string, Record<string, string>>([
    ['en', {}],
    ['fr', { ...FR_MESSAGES }],
  ]);
  private readonly current = signal('en');

  /** The current interface language. Reading it in a template or a computed tracks language changes. */
  readonly lang = this.current.asReadonly();

  get languages(): string[] {
    return [...this.dictionaries.keys()];
  }

  /** Switch language. An unknown code falls back to English. Returns the language now in use. */
  use(code: string): string {
    this.current.set(this.dictionaries.has(code) ? code : 'en');
    return this.current();
  }

  /** Register more strings for a language. A feature adds its own so the rest of the app does not carry them. */
  add(code: string, messages: Readonly<Record<string, string>>): void {
    this.dictionaries.set(code, { ...(this.dictionaries.get(code) ?? {}), ...messages });
  }

  /** Translate an interface string. `vars` fills {placeholders}. */
  t(source: string, vars?: Readonly<Record<string, string | number | null | undefined>>): string {
    const translated = this.dictionaries.get(this.current())?.[source] || source;
    if (!vars) return translated;
    return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => {
      const value = vars[key];
      return value != null ? String(value) : placeholder;
    });
  }

  /** A small number written out ("Eight"); larger numbers stay digits. */
  numberWord(n: number): string {
    const words = NUMBER_WORDS[this.current()] ?? NUMBER_WORDS['en'];
    return n >= 0 && n <= 20 && Number.isInteger(n) ? words[n] : String(n);
  }
}
