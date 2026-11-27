import { InkTable } from './ink-table';
import { PdfTheme } from './pdf-theme';
import { ThemeEffects } from './theme-effects';
import { ThemeMode } from './theme-mode';

export interface CvTheme {
  readonly mode: ThemeMode;
  readonly pdf: PdfTheme;
  readonly lead: string;
  readonly rotation: readonly string[];
  readonly inks: InkTable;
  readonly seed: string;
  readonly code: string;
  readonly seedIsDefault: boolean;
  readonly density: 'compact' | 'comfortable' | 'spacious';
  readonly motion: number;
  readonly font: { readonly family: string; readonly google: boolean };
  readonly effects: ThemeEffects;
  readonly layout: { readonly hero: 'left' | 'center'; readonly width: 'standard' | 'wide' };
}
