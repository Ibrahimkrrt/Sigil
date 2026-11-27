import { Injectable, inject } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { LooseRecord } from '@domain/models/loose-record';
import { escapeHtml } from '@domain/text/escape-html';
import { jsonIsland } from '@domain/text/json-island';
import { PersonRecord } from '../layout/person-record';

/**
 * Fills the single-file viewer page (built by `npm run build:exports`) for one CV:
 * its title and description for search engines and link previews, its language,
 * and, for a self-contained file, the CV and its assets.
 */
@Injectable({ providedIn: 'root' })
export class ViewerTemplate {
  private readonly person = inject(PersonRecord);

  /**
   * @param template the viewer page with its four placeholders
   * @param raw the CV file to embed, or null for a page that loads cv.json beside it
   * @param assets asset path to data URL, embedded with the CV
   */
  fill(template: string, model: CvModel, raw: LooseRecord | null, assets: Readonly<Record<string, string>> = {}): string {
    const title = escapeHtml(this.person.title(model));
    const description = escapeHtml(this.person.description(model));
    const lang = escapeHtml(model.meta.lang);
    const head = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:type" content="profile">`,
      `<script type="application/ld+json">${jsonIsland(this.person.jsonLd(model))}</script>`,
    ].join('\n');
    // Replacement functions: a "$" in someone's CV must not be read as a replacement pattern.
    return template
      .replace('<title>Sigil CV</title>', () => head)
      .replace('lang="en" data-sigil-lang', () => `lang="${lang}" data-sigil-lang="${lang}"`)
      .replace('"__SIGIL_DATA__"', () => (raw ? jsonIsland(raw) : '""'))
      .replace('"__SIGIL_ASSETS__"', () => jsonIsland(assets));
  }
}
