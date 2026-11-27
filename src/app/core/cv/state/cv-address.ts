import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Which CV file the page shows. By default `cv.json`; `?cv=name` in the address asks for
 * `name.cv.json` beside it, so one deployment can hold several CVs.
 */
@Injectable({ providedIn: 'root' })
export class CvAddress {
  private readonly document = inject(DOCUMENT);

  /** The name asked for in the address, or null. Only plain names: letters, digits and hyphens. */
  name(): string | null {
    const asked = new URLSearchParams(this.document.location?.search ?? '').get('cv') ?? '';
    return /^[a-z0-9]+(-[a-z0-9]+)*$/i.test(asked) ? asked.toLowerCase() : null;
  }

  /** The address of the CV file to load, relative to the page. */
  url(): string {
    const name = this.name();
    return name ? `${name}.cv.json` : 'cv.json';
  }
}
