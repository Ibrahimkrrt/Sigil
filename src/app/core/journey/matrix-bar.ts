/** One bar of the roles-by-year chart: a company, placed in time. */
export interface MatrixBar {
  readonly name: string;
  readonly title: string;
  /** Horizontal position and width, as CSS percentages of the chart's time span. */
  readonly left: string;
  readonly width: string;
  /** The stacking row, when two bars of one lane overlap in time. */
  readonly row: number;
  /** Which of the six fill styles the company uses. */
  readonly fill: number;
  /** Relative thickness on a part lane (0 to 1), or null on a role lane. */
  readonly weight: string | null;
}
