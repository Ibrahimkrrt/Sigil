import { Injectable, inject } from '@angular/core';
import { CvImage } from '@domain/models/cv-image';
import { CvLink } from '@domain/models/cv-link';
import { CvMilestone } from '@domain/models/cv-milestone';
import { CvStat } from '@domain/models/cv-stat';
import { LooseRecord } from '@domain/models/loose-record';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { isRecord } from '@domain/read/is-record';
import { safeUrl } from '@domain/text/safe-url';
import { AssetResolver } from '../assets/asset-resolver';

/** Reads the items of a custom section's content block into the shapes the page draws. */
@Injectable({ providedIn: 'root' })
export class BlockReader {
  private readonly assets = inject(AssetResolver);

  images(block: LooseRecord): (CvImage & { readonly caption: string })[] {
    return this.items(block)
      .map((item) => (typeof item === 'string' ? { src: item } : asRecord(item)))
      .filter((item) => asText(item['src']))
      .map((item) => ({ src: asText(item['src']), alt: asText(item['alt']), caption: asText(item['caption']) }));
  }

  stats(block: LooseRecord): CvStat[] {
    return this.items(block)
      .filter(isRecord)
      .filter((item) => item['value'] != null)
      .map((item) => ({ value: String(item['value']), label: asText(item['label']), detail: asText(item['detail']) }));
  }

  milestones(block: LooseRecord): CvMilestone[] {
    return this.items(block)
      .filter(isRecord)
      .filter((item) => asText(item['title']))
      .map((item) => ({ date: asText(item['date']), title: asText(item['title']), text: asText(item['text']) }));
  }

  links(block: LooseRecord): CvLink[] {
    return this.items(block)
      .map((item) => (typeof item === 'string' ? { url: item, label: item } : asRecord(item)))
      .map((item) => ({ url: asText(item['url']), label: asText(item['label']) || asText(item['url']) }))
      .filter((link) => safeUrl(link.url));
  }

  lines(block: LooseRecord): string[] {
    return this.items(block).map((item) => String(item)).filter(Boolean);
  }

  viz(block: LooseRecord): { label: string; value: number; detail: string }[] {
    return this.items(block)
      .filter(isRecord)
      .filter((item) => asText(item['label']))
      .map((item) => ({ label: asText(item['label']), value: Number(item['value']) || 0, detail: asText(item['detail']) }));
  }

  /** A loadable address for a block's media, or null when there is none or it is unsafe. */
  media(source: unknown): string | null {
    const src = asText(source);
    return src ? this.assets.resolve(src) : null;
  }

  private items(block: LooseRecord): unknown[] {
    return Array.isArray(block['items']) ? block['items'] : [];
  }
}
