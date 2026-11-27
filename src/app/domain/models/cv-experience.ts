import { CvCompany } from './cv-company';
import { CvMission } from './cv-mission';
import { CvOrganisation } from './cv-organisation';
import { CvStat } from './cv-stat';

export interface CvExperience {
  readonly id: string;
  readonly role: string;
  company: string;
  readonly location: string;
  readonly start: string;
  readonly end: string;
  readonly current: boolean;
  readonly summary: string;
  readonly stats: readonly CvStat[];
  readonly missionList: readonly CvMission[];
  readonly roles: readonly string[];
  readonly tags: readonly string[];
  readonly team: number | null;
  /** The employer a client mission was delivered through. */
  readonly employer: string;
  readonly roleSince: Readonly<Record<string, string>>;
  readonly clients: readonly string[];
  readonly companies: readonly CvCompany[];
  highlights: readonly string[];
  /** Ids of the roles this entry counts toward. */
  roleIds: string[];
  organisations: readonly CvOrganisation[];
  /** True when the entry is a client mission shown under its employer's own entry. */
  sub: boolean;
}
