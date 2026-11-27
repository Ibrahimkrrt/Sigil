/** A CV carried inside the page itself: the file, its assets as data URLs, and the language it was exported in. */
export interface EmbeddedCvData {
  readonly raw: unknown;
  readonly assets: Readonly<Record<string, string>>;
  readonly lang: string | null;
}
