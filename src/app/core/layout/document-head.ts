import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CvModel } from '@domain/models/cv-model';
import { Signature } from '../signature/signature';
import { PersonRecord } from './person-record';

/**
 * Keeps the document head in step with the CV: title, description, language, a
 * schema.org record of the person, and the signature mark as the page icon.
 */
@Injectable({ providedIn: 'root' })
export class DocumentHead {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly signature = inject(Signature);
  private readonly person = inject(PersonRecord);

  describe(model: CvModel): void {
    this.title.setTitle(this.person.title(model));
    this.meta.updateTag({ name: 'description', content: this.person.description(model) });
    this.document.documentElement.lang = model.meta.lang;

    // Metadata for search engines and link previews that run scripts. JSON in a script is data, never markup.
    let record = this.document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!record) {
      record = this.document.createElement('script');
      record.type = 'application/ld+json';
      this.document.head.append(record);
    }
    record.textContent = JSON.stringify(this.person.jsonLd(model)).replace(/</g, '\\u003c');

    // The page icon is the CV's own signature mark, in its lead ink.
    const lead = model.theme.inks[model.theme.lead];
    const svg = this.signature.svg(model.theme.seed, { bg: lead?.base ?? '#FF4A1C', fg: lead?.onAccent ?? '#0B0B0D' });
    let icon = this.document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = this.document.createElement('link');
      icon.rel = 'icon';
      this.document.head.append(icon);
    }
    icon.type = 'image/svg+xml';
    icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}
