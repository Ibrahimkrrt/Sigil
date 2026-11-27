import { PdfEdition } from './pdf-edition';

/** The files the Studio can produce: the web page two ways, the PDF editions, the project's source and the CV file. */
export type StudioExportKind = 'web' | 'standalone' | PdfEdition | 'source' | 'json';
