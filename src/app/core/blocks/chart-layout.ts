import { ChartPoint } from './chart-point';
import { ChartTick } from './chart-tick';

/** A chart laid out on a fixed drawing area, with its text summary. */
export interface ChartLayout {
  readonly kind: 'bar' | 'line';
  readonly title: string;
  readonly unit: string;
  readonly xLabel: string;
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  /** The y coordinate of the zero line. */
  readonly base: number;
  readonly barWidth: number;
  readonly points: readonly ChartPoint[];
  readonly ticks: readonly ChartTick[];
  /** The points as an SVG polyline, for a line chart. */
  readonly line: string;
  readonly summary: string;
}
