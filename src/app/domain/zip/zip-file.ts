/** One file to put in a zip archive: its path inside the archive and its content. */
export interface ZipFile {
  readonly name: string;
  readonly data: Uint8Array | string;
}
