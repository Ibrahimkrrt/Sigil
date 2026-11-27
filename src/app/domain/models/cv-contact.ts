import { CvLink } from './cv-link';

export interface CvContact {
  readonly email: string;
  readonly phone: string;
  readonly website: string;
  readonly address: string;
  readonly links: readonly CvLink[];
}
