import { CvSection } from './cv-section';

/** A section once it has been given its ink and its ground. */
export interface CvChapter extends CvSection {
  readonly accent: string;
  readonly ground: string;
}
