import { Injectable } from '@angular/core';
import { contrastRatio } from '@domain/color/contrast-ratio';
import { hexToRgb } from '@domain/color/hex-to-rgb';
import { mixRgb } from '@domain/color/mix-rgb';
import { toHex } from '@domain/color/to-hex';
import { Ink } from '@domain/models/ink';
import { InkTable } from '@domain/models/ink-table';
import { LooseRecord } from '@domain/models/loose-record';
import { ThemeMode } from '@domain/models/theme-mode';
import { isRecord } from '@domain/read/is-record';
import { GROUND_ALIASES } from './ground-aliases';
import { GROUNDS } from './grounds';
import { INK_ALIASES } from './ink-aliases';
import { INK_BLACK } from './ink-black';
import { INKS } from './inks';
import { PAPER_WHITE } from './paper-white';

/** Knows the inks and grounds: names, aliases, custom palettes, and which ground an ink prints best on. */
@Injectable({ providedIn: 'root' })
export class InkPalette {
  /**
   * The ink table for a theme. `palette` may override a colour ({ orange: "#E63900" })
   * or add one ({ plum: "#7A2E5C" }). Text-safe variants are derived, so a custom ink
   * can never produce unreadable type.
   */
  build(palette: LooseRecord = {}): InkTable {
    const inks: Record<string, Ink> = { ...INKS };
    for (const [key, value] of Object.entries(palette)) {
      const spec = typeof value === 'string' ? { base: value } : isRecord(value) ? value : null;
      const rgb = spec ? hexToRgb(spec['base']) : null;
      if (!spec || !rgb) continue;
      const base = toHex(rgb);
      const customShoulder = typeof spec['shoulder'] === 'string' && hexToRgb(spec['shoulder']) ? spec['shoulder'] : null;
      let inkDark = base;
      for (let t = 0.2; contrastRatio(inkDark, INK_BLACK) < 4.5 && t <= 1; t += 0.2) inkDark = toHex(mixRgb(rgb, [255, 255, 255], t));
      inks[INK_ALIASES[key] ?? key] = {
        base,
        shoulder: customShoulder ?? toHex(mixRgb(rgb, [255, 255, 255], 0.42)),
        onAccent: contrastRatio(base, INK_BLACK) >= contrastRatio(base, PAPER_WHITE) ? INK_BLACK : PAPER_WHITE,
        inkDark,
        inkLight: contrastRatio(base, PAPER_WHITE) >= 3 ? base : null,
      };
    }
    return inks;
  }

  /** The key of an ink given its key or an alias, or null when there is no such ink. */
  inkName(name: string, inks: InkTable = INKS): string | null {
    if (inks[name]) return name;
    const alias = INK_ALIASES[name];
    return alias && inks[alias] ? alias : null;
  }

  /** The key of a ground given its key or an alias, or null when there is no such ground. */
  groundName(name: string): string | null {
    if (GROUNDS[name]) return name;
    const alias = GROUND_ALIASES[name];
    return alias && GROUNDS[alias] ? alias : null;
  }

  /** The ground an ink prints best on, under a theme mode. `alternate` varies neighbouring chapters. */
  groundFor(accent: string, mode: Exclude<ThemeMode, 'auto'>, alternate: boolean): string {
    if (mode === 'dark') return accent === 'tangerine' && alternate ? 'teal' : 'night';
    if (mode === 'light') return alternate ? 'cloud' : 'white';
    if (accent === 'tangerine') return 'teal'; // yellow on ultramarine
    if (accent === 'electric' || accent === 'orange') return 'white'; // ultramarine or vermilion on paper
    return 'night'; // mint and pink on ink
  }
}
