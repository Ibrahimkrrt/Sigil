import { Injectable, inject } from '@angular/core';
import { CvTheme } from '@domain/models/cv-theme';
import { ThemeMode } from '@domain/models/theme-mode';
import { asList } from '@domain/read/as-list';
import { asNumber } from '@domain/read/as-number';
import { asRecord } from '@domain/read/as-record';
import { asText } from '@domain/read/as-text';
import { clamp } from '@domain/math/clamp';
import { Signature } from '../../signature/signature';
import { ACCENT_ORDER } from '../../theme/accent-order';
import { InkPalette } from '../../theme/ink-palette';

/** Reads the `theme` of a CV file and fills in everything it leaves open. */
@Injectable({ providedIn: 'root' })
export class ThemeResolver {
  private readonly signature = inject(Signature);
  private readonly palette = inject(InkPalette);
  private readonly motionWords: Readonly<Record<string, number>> = { none: 0, off: 0, subtle: 0.35, calm: 0.35, medium: 0.6, full: 1 };

  resolve(rawTheme: unknown, name: string, email: string): CvTheme {
    const theme = asRecord(rawTheme);
    // The signature seed: named in the theme, or computed from the person.
    const seed = asText(theme['seed']) || this.signature.defaultSeed(name, email);
    const effects = asRecord(theme['effects']);
    const font = typeof theme['font'] === 'string' ? { family: theme['font'] } : asRecord(theme['font']);
    const pdf = asRecord(theme['pdf']);
    const layout = asRecord(theme['layout']);
    const inks = this.palette.build(asRecord(theme['palette']));

    // Without a lead ink in the theme, the signature chooses one, and the order the other inks follow in.
    const named = this.palette.inkName(asText(theme['lead']), inks);
    const lead = named ?? this.signature.pick(seed, ACCENT_ORDER, 'lead');
    let rotation = asList(theme['accents'])
      .map((accent) => this.palette.inkName(asText(accent), inks))
      .filter((accent): accent is string => accent !== null);
    if (!rotation.length && !named) rotation = [lead, ...this.signature.shuffle(seed, ACCENT_ORDER.filter((a) => a !== lead), 'inks')];
    if (!rotation.length) {
      const i = Math.max(0, ACCENT_ORDER.indexOf(lead));
      rotation = [...(ACCENT_ORDER.includes(lead) ? [] : [lead]), ...ACCENT_ORDER.slice(i), ...ACCENT_ORDER.slice(0, i)];
    }

    const modes: readonly ThemeMode[] = ['mixed', 'dark', 'light', 'auto'];
    const mode = modes.find((m) => m === theme['mode']) ?? 'mixed';
    const density = (['compact', 'comfortable', 'spacious'] as const).find((d) => d === theme['density']) ?? 'comfortable';
    const photo = (['photo', 'dither', 'none'] as const).find((p) => p === pdf['photo']) ?? 'photo';
    return {
      mode,
      // How the print-ready PDF is drawn: on paper or on ink, and how the portrait is treated.
      pdf: { ground: pdf['ground'] === 'ink' ? 'ink' : 'paper', photo },
      lead, rotation, inks, seed,
      code: this.signature.code(seed),
      seedIsDefault: !asText(theme['seed']),
      density,
      motion: this.motion(theme['motion']),
      font: { family: asText(font['family']) || 'Bricolage Grotesque', google: font['google'] !== false },
      // Older files used spheres/rings/glow for a previous scene; they map onto the current effects.
      effects: {
        dither: (effects['dither'] ?? effects['spheres']) !== false,
        marquee: (effects['marquee'] ?? effects['rings']) !== false,
        physics: (effects['physics'] ?? effects['glow']) !== false,
        cursor: effects['cursor'] !== false,
        magnetic: effects['magnetic'] !== false,
        intro: effects['intro'] !== false,
      },
      layout: { hero: layout['hero'] === 'center' ? 'center' : 'left', width: layout['width'] === 'wide' ? 'wide' : 'standard' },
    };
  }

  /** Motion amount from 0 to 1, given a word ("subtle"), a fraction, or a percentage. */
  private motion(value: unknown): number {
    let motion = typeof value === 'string' && value.toLowerCase() in this.motionWords
      ? this.motionWords[value.toLowerCase()]
      : (asNumber(value, 0.8) ?? 0.8);
    if (motion > 1) motion = motion / 100;
    return clamp(motion, 0, 1);
  }
}
