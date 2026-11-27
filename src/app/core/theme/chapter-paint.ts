import { ChapterScene } from './chapter-scene';

/** Everything one chapter is painted with: its CSS custom properties and its dither colours. */
export interface ChapterPaint {
  readonly dark: boolean;
  readonly vars: Readonly<Record<string, string>>;
  readonly scene: ChapterScene;
}
