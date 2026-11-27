import { PdfEdition } from './pdf-edition';

/** A PDF edition as it is offered to the reader. Label and hint are in English, the translation source. */
export interface PdfFormat {
  readonly id: PdfEdition;
  readonly label: string;
  readonly hint: string;
}
