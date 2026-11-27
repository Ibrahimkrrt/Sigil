import { FieldCodec } from './field-codec';

/** Paragraphs, edited as text with a blank line between them. */
export const PARAGRAPHS_CODEC: FieldCodec = {
  read: (value) => (Array.isArray(value) ? value.join('\n\n') : typeof value === 'string' ? value : ''),
  write: (text) => {
    const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
    return paragraphs.length > 1 ? paragraphs : (paragraphs[0] ?? '');
  },
};
