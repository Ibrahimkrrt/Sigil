import { CvSkill } from '@domain/models/cv-skill';

/** The skills of one group, for the list view. */
export interface SkillCluster {
  readonly name: string;
  readonly skills: readonly CvSkill[];
  readonly names: readonly string[];
}
