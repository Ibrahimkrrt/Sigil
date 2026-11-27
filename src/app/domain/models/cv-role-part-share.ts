import { CvRolePart } from './cv-role-part';

/** A role part with the number of missions that belong to it. */
export interface CvRolePartShare extends CvRolePart {
  readonly count: number;
}
