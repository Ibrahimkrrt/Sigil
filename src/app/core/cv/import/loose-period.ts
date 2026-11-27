/** A period read from a CV file. `current` is set instead of `end` when the period is still open. */
export interface LoosePeriod {
  start: string;
  end?: string;
  current?: boolean;
}
