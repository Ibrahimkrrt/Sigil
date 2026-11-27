import { CvImage } from './cv-image';
import { CvLink } from './cv-link';
import { CvProcessStep } from './cv-process-step';
import { CvStat } from './cv-stat';

export interface CvProject {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly year: string;
  readonly summary: string;
  readonly outcome: string;
  readonly image: CvImage | null;
  readonly gallery: readonly CvImage[];
  readonly stats: readonly CvStat[];
  readonly tags: readonly string[];
  readonly process: readonly CvProcessStep[];
  readonly link: CvLink | null;
}
