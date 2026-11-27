import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { collectStrings } from '@domain/object/collect-strings';
import { firstValueFrom } from 'rxjs';
import { AssetResolver } from './asset-resolver';

/**
 * Gathers every image a CV file refers to by path, as data URLs, so an export can carry
 * them: the uploads the Studio already holds, plus the files published beside the page.
 */
@Injectable({ providedIn: 'root' })
export class AssetCollector {
  private readonly http = inject(HttpClient);
  private readonly resolver = inject(AssetResolver);

  /**
   * @param raw the CV file
   * @param held assets already in hand, path to data URL
   * @returns `held`, completed with every other image the file names that could be fetched.
   *          An image that cannot be fetched is left out: the page draws a pattern in its place.
   */
  async complete(raw: unknown, held: Readonly<Record<string, string>>): Promise<Record<string, string>> {
    const paths = new Set(
      collectStrings(raw)
        .filter((text) => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(text) && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(text))
        .map((text) => text.replace(/^\.?\//, '')),
    );
    const all: Record<string, string> = { ...held };
    await Promise.all([...paths].filter((path) => !(path in held)).map(async (path) => {
      const url = this.resolver.resolve(path);
      const data = url ? await this.fetch(url) : null;
      if (data) all[path] = data;
    }));
    return all;
  }

  private async fetch(url: string): Promise<string | null> {
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      // A single-page host answers a missing file with its index page: that is not an image.
      if (!blob.type.startsWith('image/')) return null;
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}
