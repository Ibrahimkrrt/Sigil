import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AssetResolver } from '../../assets/asset-resolver';
import { CvStore } from './cv-store';
import { EmbeddedCv } from './embedded-cv';

/** Finds the CV the page is published with, inside the page or beside it, and hands it to the store. */
@Injectable({ providedIn: 'root' })
export class CvLoader {
  private readonly http = inject(HttpClient);
  private readonly store = inject(CvStore);
  private readonly assets = inject(AssetResolver);
  private readonly embedded = inject(EmbeddedCv);
  private readonly failure = signal<string | null>(null);

  /** Why the CV could not be loaded, or null. */
  readonly error = this.failure.asReadonly();

  /**
   * Load the CV this page was published with: the one a single-file export carries, or else
   * the file at `url`. Answers with the language the export was made in, when it names one.
   */
  async loadPublished(url: string): Promise<string | null> {
    const carried = this.embedded.read();
    if (!carried) {
      await this.load(url);
      return null;
    }
    this.failure.set(null);
    this.assets.use(carried.assets);
    this.store.load(carried.raw);
    return carried.lang;
  }

  /** Load a CV file by URL. Asset paths in it resolve beside the file. */
  async load(url: string): Promise<void> {
    this.failure.set(null);
    try {
      const file = await firstValueFrom(this.http.get<unknown>(url));
      this.assets.use({}, url.includes('/') ? url.slice(0, url.lastIndexOf('/') + 1) : '');
      this.store.load(file);
    } catch (error) {
      const status = error instanceof HttpErrorResponse && error.status ? ` (${error.status})` : '';
      const invalid = error instanceof HttpErrorResponse && error.status === 200;
      this.failure.set(invalid ? `${url} is not valid JSON.` : `Could not fetch ${url}${status}.`);
    }
  }
}
