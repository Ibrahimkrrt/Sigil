import { Injectable, inject } from '@angular/core';
import { LooseRecord } from '@domain/models/loose-record';
import { isRecord } from '@domain/read/is-record';
import { AdaptedCv } from './adapted-cv';
import { CvFormat } from './cv-format';
import { CvFormatDetector } from './cv-format-detector';
import { GenericCvImporter } from './generic-cv-importer';
import { JsonResumeImporter } from './json-resume-importer';

/**
 * The importer. A CV rarely arrives in the engine's own format, so this takes whatever
 * JSON it is given and returns the engine's format, with a report of what was understood.
 */
@Injectable({ providedIn: 'root' })
export class CvAdapter {
  private readonly detector = inject(CvFormatDetector);
  private readonly jsonResume = inject(JsonResumeImporter);
  private readonly generic = inject(GenericCvImporter);
  private readonly labels: Readonly<Record<CvFormat, string>> = { sigil: 'Sigil CV', jsonresume: 'JSON Resume', generic: 'another CV format', unknown: '' };
  /** Keys already written for the engine, carried across a conversion untouched. */
  private readonly carried = ['theme', 'sections', 'customSections', 'roles', 'translations', 'achievements', 'milestones'];

  adapt(raw: unknown): AdaptedCv {
    const format = this.detector.detect(raw);
    if (!isRecord(raw) || format === 'sigil' || format === 'unknown') {
      return { data: raw, format, label: this.labels[format], converted: false, found: {} };
    }
    const data = format === 'jsonresume' ? this.jsonResume.import(raw) : this.generic.import(raw);
    for (const key of this.carried) if (raw[key] != null && data[key] == null) data[key] = raw[key];
    return { data, format, label: this.labels[format], converted: true, found: this.found(data) };
  }

  private found(data: LooseRecord): Record<string, number> {
    const count = (value: unknown): number => (Array.isArray(value) ? value.length : value ? 1 : 0);
    const part = (key: string): LooseRecord => (isRecord(data[key]) ? data[key] : {});
    return {
      name: count(part('profile')['name']),
      experience: count(data['experience']),
      education: count(data['education']),
      skills: count(part('skills')['technical']) + count(part('skills')['soft']),
      languages: count(part('skills')['languages']),
      projects: count(data['projects']),
      certifications: count(data['certifications']),
      awards: count(data['awards']),
      interests: count(data['interests']),
      contact: count(part('contact')['email']) + count(part('contact')['phone']) + count(part('contact')['links']),
    };
  }
}
