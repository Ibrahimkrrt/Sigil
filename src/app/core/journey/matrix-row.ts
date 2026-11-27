import { MatrixBar } from './matrix-bar';

/** One lane of the roles-by-year chart: a role, or one part of a role. */
export interface MatrixRow {
  readonly name: string;
  readonly part: boolean;
  /** How many stacked rows the lane needs. */
  readonly depth: number;
  readonly bars: readonly MatrixBar[];
}
