/** Choices for one PDF export. */
export interface PdfOptions {
  /** Append the accessible edition to the print-ready one, in the same file. */
  readonly append?: boolean;
  readonly size?: 'a4' | 'letter';
}
