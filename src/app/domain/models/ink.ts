/** One printing ink and the variants that keep text on it, and text in it, readable. */
export interface Ink {
  readonly base: string;
  readonly shoulder: string;
  /** The ink as text on a dark ground. */
  readonly inkDark: string;
  /** The ink as text on a light ground, or null when it cannot be read there. */
  readonly inkLight: string | null;
  /** The colour of a label set on a block of this ink. */
  readonly onAccent: string;
}
