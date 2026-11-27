/** What one dither tile draws. */
export interface DitherTileOptions {
  /** A pattern name, for a generated tile. */
  readonly pattern?: string;
  readonly seed: string;
  /** `duo` draws ground and ink, for media; `tone` draws ground and a quiet tint, safe behind text. */
  readonly mode?: 'duo' | 'tone';
  /** The size of one dither cell, in CSS pixels. */
  readonly px?: number;
  /** An image to dither instead of a pattern. */
  readonly image?: HTMLImageElement;
  /** The element whose hover wipes the dither away. */
  readonly hoverEl?: HTMLElement;
}
