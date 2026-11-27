import { Injectable, inject } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { LooseRecord } from '@domain/models/loose-record';
import { slug } from '@domain/text/slug';
import { dataUrlToBytes } from '@domain/zip/data-url-to-bytes';
import { ZipFile } from '@domain/zip/zip-file';
import { zipStore } from '@domain/zip/zip-store';
import { AssetCollector } from '../assets/asset-collector';
import { ExportKit } from './export-kit';
import { FileSaver } from './file-saver';
import { ViewerTemplate } from './viewer-template';

/**
 * Produces the CV as a web page to publish or send: one self-contained file, or a folder for a static host.
 * Both carry every image the CV names: the Studio's uploads and the files published beside the page.
 */
@Injectable({ providedIn: 'root' })
export class SiteExporter {
  private readonly kit = inject(ExportKit);
  private readonly collector = inject(AssetCollector);
  private readonly template = inject(ViewerTemplate);
  private readonly saver = inject(FileSaver);

  /** One HTML file with the CV and its assets inside. Opens from disk. */
  async saveStandalone(model: CvModel, raw: LooseRecord, uploads: Readonly<Record<string, string>>): Promise<void> {
    const assets = await this.collector.complete(raw, uploads);
    const html = this.template.fill(await this.kit.viewerTemplate(), model, raw, assets);
    this.saver.save(`${slug(model.profile.name, 'cv')}-cv.html`, new Blob([html], { type: 'text/html' }));
  }

  /** A zip with index.html, cv.json and the asset files, for any static host. */
  async saveWebPackage(model: CvModel, raw: LooseRecord, uploads: Readonly<Record<string, string>>): Promise<void> {
    const assets = await this.collector.complete(raw, uploads);
    const files: ZipFile[] = [
      { name: 'index.html', data: this.template.fill(await this.kit.viewerTemplate(), model, null) },
      { name: 'cv.json', data: JSON.stringify(raw, null, 2) },
      { name: 'README.txt', data: 'Sigil web CV\n\nUpload this folder to any static host. The page loads cv.json at run time,\nso you can edit cv.json and the files in assets/ without touching index.html.\nOpening index.html straight from disk will not work in most browsers because\nthey block file:// requests; use the standalone HTML export for that.\n' },
    ];
    for (const [path, url] of Object.entries(assets)) {
      const bytes = dataUrlToBytes(url);
      if (bytes) files.push({ name: path, data: bytes });
    }
    this.saver.save(`${slug(model.profile.name, 'cv')}-web-cv.zip`, new Blob([zipStore(files)], { type: 'application/zip' }));
  }

  /** The project this Studio was built from, as a zip. */
  async saveSource(): Promise<void> {
    this.saver.save('sigil-angular-source.zip', new Blob([await this.kit.sourceArchive()], { type: 'application/zip' }));
  }
}
