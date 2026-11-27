import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * The two files the build prepares for the Studio's exports and publishes under export/:
 * the single-file viewer page and the project's source archive. Each is fetched once, when first asked for.
 */
@Injectable({ providedIn: 'root' })
export class ExportKit {
  private readonly http = inject(HttpClient);
  private template: Promise<string> | null = null;

  /** The single-file viewer page, with its placeholders still in. */
  viewerTemplate(): Promise<string> {
    this.template ??= firstValueFrom(this.http.get('export/viewer.html', { responseType: 'text' })).catch((error: unknown) => {
      this.template = null;
      throw new Error('the viewer page is not built. Run "npm run build" first.', { cause: error });
    });
    return this.template;
  }

  /** The project's source, as a zip. */
  async sourceArchive(): Promise<ArrayBuffer> {
    try {
      return await firstValueFrom(this.http.get('export/sigil-angular-source.zip', { responseType: 'arraybuffer' }));
    } catch (error) {
      throw new Error('the source archive is not built. Run "npm run build" first.', { cause: error });
    }
  }
}
