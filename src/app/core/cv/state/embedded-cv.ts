import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { isRecord } from '@domain/read/is-record';
import { EmbeddedCvData } from './embedded-cv-data';

/**
 * Reads the CV a single-file export carries in two data islands (script elements of type
 * application/json). A page published beside its cv.json has empty islands, or none.
 */
@Injectable({ providedIn: 'root' })
export class EmbeddedCv {
  private readonly document = inject(DOCUMENT);

  /** The embedded CV, or null when the page has none. */
  read(): EmbeddedCvData | null {
    const raw = this.island('sigil-data');
    if (!isRecord(raw)) return null;
    const assets = this.island('sigil-assets');
    const urls = Object.entries(isRecord(assets) ? assets : {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    return { raw, assets: Object.fromEntries(urls), lang: this.document.documentElement.getAttribute('data-sigil-lang') || null };
  }

  private island(id: string): unknown {
    try {
      return JSON.parse(this.document.getElementById(id)?.textContent ?? 'null');
    } catch {
      return null;
    }
  }
}
