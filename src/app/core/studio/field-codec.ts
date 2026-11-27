/** Converts a field between its value in the CV file and the text a person edits. */
export interface FieldCodec {
  readonly read: (value: unknown) => string;
  readonly write: (text: string) => unknown;
}
