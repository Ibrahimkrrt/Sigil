import { MatrixBar } from './matrix-bar';
import { MatrixRow } from './matrix-row';

/** The roles-by-year chart, ready to draw, with its description for assistive technology. */
export interface RoleMatrix {
  readonly years: readonly number[];
  readonly employers: readonly MatrixBar[];
  readonly rows: readonly MatrixRow[];
  /** Companies in legend order; the index gives each its fill style. */
  readonly companies: readonly string[];
  readonly description: string;
}
