import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * A read-only handle on the page for scripts outside the app (integrations, end-to-end
 * tests): `window.sigil.model`, `window.sigil.imported`. Values are read when asked for,
 * so they are always current.
 */
@Injectable({ providedIn: 'root' })
export class PageHandle {
  private readonly view = inject(DOCUMENT).defaultView as (Window & Record<string, unknown>) | null;

  /** Publish getters under a global name. */
  expose(name: string, getters: Readonly<Record<string, () => unknown>>): void {
    if (!this.view) return;
    const handle = {};
    for (const [key, read] of Object.entries(getters)) Object.defineProperty(handle, key, { get: read, enumerable: true });
    this.view[name] = handle;
  }
}
