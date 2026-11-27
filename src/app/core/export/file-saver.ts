import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Hands a generated file to the reader as a download. */
@Injectable({ providedIn: 'root' })
export class FileSaver {
  private readonly document = inject(DOCUMENT);

  save(fileName: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    this.document.body.append(link);
    link.click();
    link.remove();
    // Released once the browser has had time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
