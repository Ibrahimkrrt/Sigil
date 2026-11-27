import { Injectable, inject } from '@angular/core';
import { CvModel } from '@domain/models/cv-model';
import { LooseRecord } from '@domain/models/loose-record';
import { slug } from '@domain/text/slug';
import { AssetResolver } from '../assets/asset-resolver';
import { CvPdfBuilder } from './cv-pdf-builder';
import { FileSaver } from './file-saver';
import { PdfEdition } from './pdf-edition';
import { PdfImageLoader } from './pdf-image-loader';
import { PdfOptions } from './pdf-options';

/** Produces the files a CV can be downloaded as: its three PDF editions and its JSON. */
@Injectable({ providedIn: 'root' })
export class CvExporter {
  private readonly builder = inject(CvPdfBuilder);
  private readonly images = inject(PdfImageLoader);
  private readonly assets = inject(AssetResolver);
  private readonly saver = inject(FileSaver);

  /** Build one PDF edition and hand it to the reader. Only the print edition carries the portrait. */
  async savePdf(model: CvModel, edition: PdfEdition, options: PdfOptions = {}): Promise<void> {
    const images = edition === 'print' ? await this.images.pdfImages(model, this.assets) : {};
    const append = edition === 'print' && !!options.append;
    const bytes: Uint8Array<ArrayBuffer> = this.builder.buildCvPdf(model, edition, { size: options.size ?? 'a4', images, append });
    this.saver.save(this.builder.pdfFileName(model, edition, { append }), new Blob([bytes], { type: 'application/pdf' }));
  }

  /** Hand the CV file itself to the reader, formatted for reading. */
  saveJson(raw: LooseRecord, name: string): void {
    this.saver.save(`${slug(name, 'cv')}.cv.json`, new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' }));
  }
}
