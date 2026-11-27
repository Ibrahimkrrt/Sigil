import { Rgb } from '@domain/models/rgb';

/** The colours the dither layer draws a chapter with. */
export interface ChapterScene {
  readonly ground: Rgb;
  readonly tone: Rgb;
  readonly accent: Rgb;
  readonly fg: Rgb;
  readonly dark: boolean;
}
