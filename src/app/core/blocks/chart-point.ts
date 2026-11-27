/** One value of a chart, with where it is drawn. */
export interface ChartPoint {
  readonly label: string;
  readonly value: number;
  readonly x: number;
  readonly y: number;
}
