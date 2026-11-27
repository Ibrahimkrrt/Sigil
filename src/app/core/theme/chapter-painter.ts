import { Injectable } from '@angular/core';
import { contrastRatio } from '@domain/color/contrast-ratio';
import { mixHex } from '@domain/color/mix-hex';
import { rgbOf } from '@domain/color/rgb-of';
import { InkTable } from '@domain/models/ink-table';
import { ChapterPaint } from './chapter-paint';
import { GROUNDS } from './grounds';
import { INK_BLACK } from './ink-black';
import { PAPER_WHITE } from './paper-white';

/** Resolves the colours of one chapter from its ink and its ground, keeping every pairing readable. */
@Injectable({ providedIn: 'root' })
export class ChapterPainter {
  paint(inks: InkTable, accentName: string, groundKey: string): ChapterPaint {
    const ink = inks[accentName] ?? inks['orange'];
    const ground = GROUNDS[groundKey] ?? GROUNDS['night'];
    const dark = ground.dark;
    const fg = dark ? PAPER_WHITE : INK_BLACK;

    let soft = fg;
    for (let k = dark ? 0.22 : 0.3; k >= 0; k -= 0.02) {
      soft = mixHex(fg, ground.bg, k);
      if (contrastRatio(soft, ground.bg) >= 4.7) break;
    }

    // The accent as type must clear 4.5:1 for small text. Otherwise the text colour is used.
    let accentInk = dark ? ink.inkDark : ink.inkLight;
    if (!accentInk || contrastRatio(accentInk, ground.bg) < 3) accentInk = fg;
    const small = contrastRatio(accentInk, ground.bg) >= 4.5 ? accentInk : fg;

    // The accent as a fill needs a readable label on top.
    let fill = ink.base;
    let onFill = ink.onAccent;
    if (contrastRatio(fill, ground.bg) < 1.6) {
      fill = fg;
      onFill = ground.bg;
    }

    // The quiet second colour behind text: the strongest tint of the ink that keeps
    // body text above 7:1 and accent display type above 3:1.
    let tone = ground.bg;
    for (let a = 0.3; a >= 0.04; a -= 0.02) {
      const candidate = mixHex(ground.bg, ink.base, a);
      if (contrastRatio(fg, candidate) >= 7 && contrastRatio(soft, candidate) >= 4.6 && contrastRatio(accentInk, candidate) >= 3.05) {
        tone = candidate;
        break;
      }
    }

    return {
      dark,
      vars: {
        '--ground': ground.bg,
        '--fg': fg,
        '--fg-soft': soft,
        '--line': mixHex(fg, ground.bg, 0.62),
        '--accent': fill,
        '--on-accent': onFill,
        '--ink': accentInk,
        '--ink-small': small,
        '--panel': mixHex(ground.bg, fg, dark ? 0.08 : 0.06),
        '--tone': tone,
      },
      scene: { ground: rgbOf(ground.bg), tone: rgbOf(tone), accent: rgbOf(fill), fg: rgbOf(fg), dark },
    };
  }
}
