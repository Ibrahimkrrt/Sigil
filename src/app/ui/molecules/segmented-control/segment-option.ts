/** One choice of a segmented control. */
export interface SegmentOption {
  readonly value: string;
  readonly label: string;
  /** A fuller name for assistive technology, when the label is an abbreviation. */
  readonly title?: string;
}
