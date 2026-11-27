import { Injectable } from '@angular/core';

/** Remembers the language a visitor chose, so the CV opens in it on their next visit. */
@Injectable({ providedIn: 'root' })
export class LanguageMemory {
  private readonly key = 'sigil-lang';

  recall(): string | null {
    try {
      return localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  keep(code: string): void {
    try {
      localStorage.setItem(this.key, code);
    } catch {
      // Storage is unavailable: the choice lasts for this visit.
    }
  }
}
