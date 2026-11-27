import { ValidationIssue } from './validation-issue';

export interface ValidationReport {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}
