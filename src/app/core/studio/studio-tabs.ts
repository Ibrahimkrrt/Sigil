import { StudioTab } from './studio-tab';

/** The editor's tabs, in order, with their English labels (the translation source). */
export const STUDIO_TABS: readonly (readonly [StudioTab, string])[] = [
  ['content', 'Content'], ['sections', 'Sections'], ['theme', 'Theme'], ['assets', 'Assets'], ['json', 'JSON'], ['export', 'Export'],
];
