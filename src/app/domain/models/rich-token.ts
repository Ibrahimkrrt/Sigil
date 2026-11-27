/** One piece of rich text: plain text, bold, emphasis, a link or a line break. */
export type RichToken =
  | { readonly kind: 'text' | 'strong' | 'em'; readonly text: string }
  | { readonly kind: 'link'; readonly text: string; readonly url: string }
  | { readonly kind: 'break' };
