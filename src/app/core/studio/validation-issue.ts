/** One problem or hint found in a CV file. */
export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}
