import { CvFormat } from './cv-format';

/** The result of importing a CV file: the content in the engine's format, and what was understood. */
export interface AdaptedCv {
  readonly data: unknown;
  readonly format: CvFormat;
  /** The name of the source format, for messages. */
  readonly label: string;
  readonly converted: boolean;
  /** How many items of each kind were recognised, so a person can check the conversion. */
  readonly found: Readonly<Record<string, number>>;
}
