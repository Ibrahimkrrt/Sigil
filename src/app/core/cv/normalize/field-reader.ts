import { Injectable } from '@angular/core';
import { CvImage } from '@domain/models/cv-image';
import { CvLink } from '@domain/models/cv-link';
import { CvStat } from '@domain/models/cv-stat';
import { asList } from '@domain/read/as-list';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';

/** Reads the small value shapes a CV file repeats everywhere: images, figures and links. */
@Injectable({ providedIn: 'root' })
export class FieldReader {
  image(value: unknown): CvImage | null {
    if (typeof value === 'string') return value.trim() ? { src: value.trim(), alt: '', caption: '' } : null;
    const o = asRecord(value);
    return asText(o['src']) ? { src: asText(o['src']), alt: asText(o['alt']), caption: asText(o['caption']) } : null;
  }

  images(value: unknown): CvImage[] {
    return asList(value).map((item) => this.image(item)).filter((item): item is CvImage => item !== null);
  }

  stats(value: unknown): CvStat[] {
    return asList(value)
      .map((item) => (isRecord(item)
        ? { value: asText(item['value']), label: asText(item['label']), detail: asText(item['detail']) }
        : { value: asText(item), label: '', detail: '' }))
      .filter((stat) => stat.value);
  }

  link(value: unknown): CvLink | null {
    const o = typeof value === 'string' ? { url: value } : asRecord(value);
    const url = asText(o['url'] || o['href']);
    if (!url) return null;
    return { label: asText(o['label']) || url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), url };
  }

  links(value: unknown): CvLink[] {
    return asList(value).map((item) => this.link(item)).filter((item): item is CvLink => item !== null);
  }

  texts(value: unknown): string[] {
    return asList(value).map((item) => asText(item)).filter(Boolean);
  }
}
