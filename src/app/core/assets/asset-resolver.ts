import { Injectable, signal } from '@angular/core';
import { safeUrl } from '@domain/text/safe-url';

/**
 * Maps the paths a CV file uses ("assets/portrait.jpg") to something the browser can
 * load: first an embedded asset (uploads, single-file exports), then a URL beside the page.
 */
@Injectable({ providedIn: 'root' })
export class AssetResolver {
  private readonly embedded = signal<Readonly<Record<string, string>>>({});
  private readonly base = signal('');

  /** The embedded assets, by path. */
  readonly map = this.embedded.asReadonly();

  use(map: Readonly<Record<string, string>>, base = ''): void {
    this.embedded.set(map);
    this.base.set(base);
  }

  /** A loadable URL, or null when the reference is unsafe. */
  resolve(src: string): string | null {
    const clean = safeUrl(src, true);
    if (!clean) return null;
    if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
    const key = clean.replace(/^\.?\//, '');
    return this.embedded()[key] ?? this.base() + key;
  }
}
