export interface CvSkill {
  readonly name: string;
  /** 0 to 100, or null when the CV gives no level. */
  readonly level: number | null;
  readonly group: string;
}
