/** The languages a CV can be shown in. */
export interface CvLanguages {
  /** The language the CV's own content is written in. */
  readonly base: string;
  readonly all: readonly string[];
}
