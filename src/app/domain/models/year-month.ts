export interface YearMonth {
  readonly y: number;
  /** 1 to 12, or null when only the year is known. */
  readonly m: number | null;
}
