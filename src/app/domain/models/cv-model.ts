import { Archetype } from './archetype';
import { CvContact } from './cv-contact';
import { CvCredential } from './cv-credential';
import { CvEducation } from './cv-education';
import { CvExperience } from './cv-experience';
import { CvMeta } from './cv-meta';
import { CvMilestone } from './cv-milestone';
import { CvPosition } from './cv-position';
import { CvProfile } from './cv-profile';
import { CvProject } from './cv-project';
import { CvSection } from './cv-section';
import { CvSkills } from './cv-skills';
import { CvStat } from './cv-stat';
import { CvTheme } from './cv-theme';
import { LooseRecord } from './loose-record';

/** A CV after normalisation: complete and predictable, whatever the file contained. */
export interface CvModel {
  readonly raw: LooseRecord;
  readonly meta: CvMeta;
  readonly profile: CvProfile;
  readonly contact: CvContact;
  readonly experience: readonly CvExperience[];
  readonly milestones: readonly CvMilestone[];
  readonly achievements: readonly CvStat[];
  readonly projects: readonly CvProject[];
  readonly skills: CvSkills;
  readonly education: readonly CvEducation[];
  readonly certifications: readonly CvCredential[];
  readonly awards: readonly CvCredential[];
  readonly interests: readonly string[];
  readonly positions: readonly CvPosition[];
  readonly careerYears: number;
  readonly archetype: Archetype;
  readonly theme: CvTheme;
  readonly sections: readonly CvSection[];
}
