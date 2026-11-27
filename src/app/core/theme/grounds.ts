import { Ground } from '@domain/models/ground';

/** The page grounds a chapter can be printed on. Key names are historical, like the inks. */
export const GROUNDS: Readonly<Record<string, Ground>> = {
  night: { bg: '#0B0B0D', dark: true }, // ink
  teal: { bg: '#2B3BFF', dark: true }, // ultramarine page
  white: { bg: '#F2F1EC', dark: false }, // paper
  cloud: { bg: '#DCDBD4', dark: false }, // newsprint
};
