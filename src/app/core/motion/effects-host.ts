import { CvModel } from '@domain/models/cv-model';

/** What the page hands to its effects: where they run, the CV, and how to act on the page. */
export interface EffectsHost {
  /** The root of the page: the element carrying the `scv` class. */
  readonly root: HTMLElement;
  /** The immersive view. */
  readonly main: HTMLElement;
  readonly model: CvModel;
  /** Scroll to a chapter by id. */
  readonly goTo: (id: string) => void;
}
