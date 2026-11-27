import { CvEngagement } from './cv-engagement';
import { CvExperience } from './cv-experience';
import { CvOrganisation } from './cv-organisation';
import { CvRolePartShare } from './cv-role-part-share';

/**
 * A stop on the journey. With roles in the CV a position is a role held across
 * companies (`kind: 'role'`); without, it is one experience entry (`kind: 'entry'`).
 */
export interface CvPosition {
  readonly kind: 'role' | 'entry';
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly parts: readonly CvRolePartShare[];
  readonly start: string;
  readonly end: string;
  readonly current: boolean;
  readonly years: number;
  /** Role positions: the companies the role was held at. */
  readonly engagements: readonly CvEngagement[];
  /** Entry positions: the experience entry and the organisations it covers. */
  readonly experience: CvExperience | null;
  readonly organisations: readonly CvOrganisation[];
}
