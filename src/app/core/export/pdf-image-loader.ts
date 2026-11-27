import { Injectable, inject } from '@angular/core';
import { hexToRgb } from '@domain/color/hex-to-rgb';
import { ChapterPainter } from '../theme/chapter-painter';

/**
 * Prepares images for the PDF writer, lifted from the reference engine: the portrait is
 * cropped square, optionally dithered into the CV's two colours, and handed over as JPEG
 * bytes. Any failure simply means "no portrait".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
@Injectable({ providedIn: 'root' })
export class PdfImageLoader {
  private readonly painter = inject(ChapterPainter);

  private BAYER: any = [0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24, 36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6, 54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21];

  private load(url: any): any {
    return new Promise((resolve: any, reject: any) => {
      const img: any = new Image();
      if (!/^(data|blob):/.test(url)) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img); img.onerror = reject; img.src = url;
    });
  }

  /** @returns {Promise<{ portrait?: { bytes: Uint8Array, w: number, h: number } }>} */
  async pdfImages(model: any, assets: any): Promise<any> {
    const mode: any = model.theme.pdf.photo;
    const photo: any = model.profile.photo;
    if (!photo || mode === 'none' || !assets) return {};
    try {
      const url: any = assets.resolve(photo.src);
      if (!url) return {};
      const img: any = await this.load(url);
      const S: any = 480, side: any = Math.min(img.naturalWidth || S, img.naturalHeight || S);
      const cv: any = document.createElement('canvas'); cv.width = cv.height = S;
      const g: any = cv.getContext('2d');
      g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, S, S);
      // Square crop, kept toward the top where a face usually is.
      g.drawImage(img, ((img.naturalWidth || S) - side) / 2, ((img.naturalHeight || S) - side) * 0.25, side, side, 0, 0, S, S);
      if (mode === 'dither') {
        const v: any = this.painter.paint.bind(this.painter)(model.theme.inks, model.theme.lead, 'night').vars;
        const a: any = hexToRgb(v['--ground']), b: any = hexToRgb(v['--accent']);
        const cell: any = 4, small: any = S / cell;
        const tmp: any = document.createElement('canvas'); tmp.width = tmp.height = small;
        tmp.getContext('2d').drawImage(cv, 0, 0, small, small);
        const src: any = tmp.getContext('2d').getImageData(0, 0, small, small).data;
        for (let y: any = 0; y < small; y++) for (let x: any = 0; x < small; x++) {
          const i: any = (y * small + x) * 4;
          const lum: any = (0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2]) / 255;
          const on: any = lum * 1.08 > (this.BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
          g.fillStyle = `rgb(${(on ? b : a).join(',')})`; g.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      const data: any = atob(cv.toDataURL('image/jpeg', mode === 'dither' ? 0.96 : 0.9).split(',')[1]);
      const bytes: any = new Uint8Array(data.length);
      for (let i: any = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
      return { portrait: { bytes, w: S, h: S } };
    } catch { return {}; }
  }
}
