import { PdfFormat } from './pdf-format';

export const PDF_FORMATS: readonly PdfFormat[] = [
  { id: 'ats', label: 'ATS-friendly PDF', hint: 'Plain, single column, machine-readable' },
  { id: 'accessible', label: 'Accessible PDF', hint: 'The same CV in larger type, WCAG 2.0 compatible, with AA/AAA-compliant contrast.' },
  { id: 'print', label: 'Print-ready PDF', hint: 'Designed layout, with portrait' },
];
