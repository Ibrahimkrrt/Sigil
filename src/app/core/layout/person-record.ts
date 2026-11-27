import { Injectable } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { plainText } from '@domain/text/plain-text';

/** Describes the person for search engines and link previews: a title, a description, and a schema.org Person record. */
@Injectable({ providedIn: 'root' })
export class PersonRecord {
  title(model: CvModel): string {
    const profile = model.profile;
    return model.meta.title || `${profile.name}${profile.headline ? `, ${plainText(profile.headline)}` : ''}`;
  }

  description(model: CvModel): string {
    const profile = model.profile;
    return model.meta.description || plainText(profile.tagline || profile.summary[0] || profile.headline || '');
  }

  jsonLd(model: CvModel): Record<string, unknown> {
    const profile = model.profile;
    const description = this.description(model);
    const employer = model.experience[0]?.company;
    return {
      '@context': 'https://schema.org', '@type': 'Person', name: profile.name,
      ...(profile.headline ? { jobTitle: profile.headline } : {}),
      ...(description ? { description } : {}),
      ...(profile.location ? { address: profile.location } : {}),
      ...(model.contact.email ? { email: `mailto:${model.contact.email}` } : {}),
      ...(model.contact.website ? { url: model.contact.website } : {}),
      ...(model.contact.links.length ? { sameAs: model.contact.links.map((link) => link.url) } : {}),
      ...(employer ? { worksFor: { '@type': 'Organization', name: employer } } : {}),
      ...(model.skills.technical.length ? { knowsAbout: model.skills.technical.map((skill) => skill.name) } : {}),
    };
  }
}
