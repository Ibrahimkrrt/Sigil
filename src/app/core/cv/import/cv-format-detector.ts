import { Injectable } from '@angular/core';
import { isRecord } from '@domain/read/is-record';
import { CvFormat } from './cv-format';

/** Tells which kind of CV file a JSON document is. */
@Injectable({ providedIn: 'root' })
export class CvFormatDetector {
  detect(raw: unknown): CvFormat {
    if (!isRecord(raw)) return 'unknown';
    const profile = raw['profile'];
    // The engine's own format: a profile object, or its own section keys.
    if (isRecord(profile) && !isRecord(raw['basics'])) {
      const own = profile['name'] || profile['givenName'] || profile['headline'] || raw['sections'] || raw['theme'] || raw['experience'] || raw['contact'];
      if (own) return 'sigil';
    }
    if (raw['customSections'] || raw['sections'] || (raw['theme'] && raw['experience'] && !raw['basics'])) return 'sigil';
    const work = raw['work'];
    const resumeWork = Array.isArray(work) && work.some((item) => isRecord(item) && ('position' in item || 'startDate' in item));
    return isRecord(raw['basics']) || resumeWork ? 'jsonresume' : 'generic';
  }
}
