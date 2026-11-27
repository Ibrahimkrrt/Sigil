import { InkTable } from '@domain/models/ink-table';

/**
 * The printing inks. Key names date from the first version of the engine and are kept
 * so existing CV files keep working; `INK_ALIASES` gives the readable names.
 */
export const INKS: InkTable = {
  orange: { base: '#FF4A1C', shoulder: '#FF8A66', inkDark: '#FF5A2E', inkLight: '#D93A10', onAccent: '#0B0B0D' }, // vermilion
  electric: { base: '#2B3BFF', shoulder: '#7C86FF', inkDark: '#8C95FF', inkLight: '#2B3BFF', onAccent: '#F2F1EC' }, // ultramarine
  tangerine: { base: '#FFE600', shoulder: '#FFF27A', inkDark: '#FFE600', inkLight: null, onAccent: '#0B0B0D' }, // yellow
  seafoam: { base: '#2EF2A6', shoulder: '#9AF9D4', inkDark: '#2EF2A6', inkLight: null, onAccent: '#0B0B0D' }, // mint
  horizon: { base: '#FF7AD9', shoulder: '#FFB8EA', inkDark: '#FF8ADE', inkLight: null, onAccent: '#0B0B0D' }, // pink
  night: { base: '#55565C', shoulder: '#A9AAB0', inkDark: '#F2F1EC', inkLight: '#0B0B0D', onAccent: '#F2F1EC' },
};
