import { CvExperience } from './cv-experience';
import { CvRolePartShare } from './cv-role-part-share';

/** One company where a role was held, with the missions carried out there in that role. */
export interface CvEngagement {
  readonly name: string;
  readonly via: string;
  readonly title: string;
  readonly experience: CvExperience;
  readonly start: string;
  readonly end: string;
  readonly current: boolean;
  readonly missions: readonly string[];
  /** For each mission, the ids of the role parts it belongs to. */
  readonly missionParts: readonly (readonly string[])[];
  readonly parts: readonly CvRolePartShare[];
}
