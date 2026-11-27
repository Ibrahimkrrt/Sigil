import { CvModel } from './cv-model';

/** A normalised CV before its chapters have been resolved. */
export type CvContent = Omit<CvModel, 'sections'>;
