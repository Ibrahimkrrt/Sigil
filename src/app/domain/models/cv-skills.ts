import { CvLanguage } from './cv-language';
import { CvSkill } from './cv-skill';

export interface CvSkills {
  readonly technical: readonly CvSkill[];
  readonly soft: readonly string[];
  readonly languages: readonly CvLanguage[];
}
